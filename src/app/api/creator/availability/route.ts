import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { asRecord, str, num, arr } from "@/lib/public/block-config";

export const runtime = "nodejs";

function validTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const HM = /^([01]?\d|2[0-3]):[0-5]\d$/;
const clampInt = (v: number | null, min: number, max: number, dflt: number) =>
  v === null ? dflt : Math.min(max, Math.max(min, Math.floor(v)));

function sanitizeAvailability(raw: unknown) {
  const r = asRecord(raw);
  const tz = str(r.timezone) || "UTC";
  if (!validTimezone(tz)) throw new Error("منطقة زمنية غير صالحة.");

  const weekly = arr(r.weekly)
    .map((w) => {
      const wr = asRecord(w);
      const day = num(wr.day);
      if (day === null || day < 0 || day > 6) return null;
      const ranges = arr(wr.ranges)
        .map((x) => {
          const xr = asRecord(x);
          const start = str(xr.start);
          const end = str(xr.end);
          if (!HM.test(start) || !HM.test(end) || start >= end) return null;
          return { start, end };
        })
        .filter((x): x is { start: string; end: string } => x !== null)
        .slice(0, 8);
      return { day, ranges };
    })
    .filter((x): x is { day: number; ranges: { start: string; end: string }[] } => x !== null);

  const exceptions = arr(r.exceptions)
    .map((x) => str(x))
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
    .slice(0, 60);

  return {
    timezone: tz,
    slotMinutes: clampInt(num(r.slotMinutes), 5, 480, 30),
    bufferMinutes: clampInt(num(r.bufferMinutes), 0, 240, 0),
    horizonDays: clampInt(num(r.horizonDays), 1, 120, 30),
    weekly,
    exceptions,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { availability: true },
  });
  return NextResponse.json({ ok: true, availability: profile?.availability ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "لا يوجد ملف." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  let clean;
  try {
    clean = sanitizeAvailability(body);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "إدخال غير صالح." },
      { status: 422 },
    );
  }

  await prisma.availability.upsert({
    where: { creatorProfileId: profile.id },
    update: {
      timezone: clean.timezone,
      slotMinutes: clean.slotMinutes,
      bufferMinutes: clean.bufferMinutes,
      horizonDays: clean.horizonDays,
      weekly: clean.weekly as object,
      exceptions: clean.exceptions as object,
    },
    create: {
      creatorProfileId: profile.id,
      timezone: clean.timezone,
      slotMinutes: clean.slotMinutes,
      bufferMinutes: clean.bufferMinutes,
      horizonDays: clean.horizonDays,
      weekly: clean.weekly as object,
      exceptions: clean.exceptions as object,
    },
  });

  return NextResponse.json({ ok: true });
}
