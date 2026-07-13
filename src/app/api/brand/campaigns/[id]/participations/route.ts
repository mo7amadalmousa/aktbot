import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { asRecord, str } from "@/lib/public/block-config";
import { normalizeUsername } from "@/lib/validation";
import { ensureParticipation } from "@/lib/attribution/engine";

export const runtime = "nodejs";

// إضافة مبدع لحملة (بواسطة username) → توليد كود/رابط فريدين. ملكية العلامة.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  if (session.role !== "BRAND" && session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  // ملكية: الحملة تخصّ علامة هذا المستخدم.
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, brand: { select: { userId: true } } },
  });
  if (!campaign || (session.role !== "ADMIN" && campaign.brand.userId !== session.sub)) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const username = normalizeUsername(str(asRecord(body).username));
  const creator = await prisma.creatorProfile.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!creator) {
    return NextResponse.json({ ok: false, error: "لا مبدع بهذا الاسم." }, { status: 404 });
  }

  const p = await ensureParticipation(campaign.id, creator.id);
  return NextResponse.json({
    ok: true,
    participationId: p.id,
    code: p.code,
    link: p.link,
    created: p.created,
  });
}
