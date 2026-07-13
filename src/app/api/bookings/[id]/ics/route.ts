import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validation";
import { parseConsultationConfig } from "@/lib/booking/service";

export const runtime = "nodejs";

// تنسيق ICS الأساسيّ (UTC): YYYYMMDDTHHMMSSZ
function icsStamp(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

// ملف تقويم (.ics) لموعد — يُتحقّق بمطابقة البريد (لا تعداد).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const email = normalizeEmail(req.nextUrl.searchParams.get("e") ?? "");

  const b = email
    ? await prisma.booking.findUnique({
        where: { id },
        include: { creatorProfile: { select: { displayName: true } } },
      })
    : null;

  if (
    !b ||
    normalizeEmail(b.buyerEmail) !== email ||
    b.status === "CANCELLED"
  ) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }

  const block = await prisma.block.findUnique({
    where: { id: b.consultationBlockId },
    select: { config: true },
  });
  const cfg = block ? parseConsultationConfig(block.config) : null;
  const title = cfg?.title || "استشارة";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AktBot//Booking//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@aktbot`,
    `DTSTAMP:${icsStamp(b.createdAt.toISOString())}`,
    `DTSTART:${icsStamp(b.startAt.toISOString())}`,
    `DTEND:${icsStamp(b.endAt.toISOString())}`,
    `SUMMARY:${esc(`${title} — ${b.creatorProfile.displayName}`)}`,
    b.meetingLink ? `URL:${esc(b.meetingLink)}` : "",
    `DESCRIPTION:${esc(cfg?.instructions || "موعد عبر AktBot")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="booking-${b.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
