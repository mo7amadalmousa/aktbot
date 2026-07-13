import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { cancelBooking } from "@/lib/booking/service";

export const runtime = "nodejs";

// إلغاء موعد من الداشبورد — ملكية المبدع فقط. يحرّر الموعد + بريد الطرفين.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const { id } = await params;

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { creatorProfileId: true },
  });
  if (!profile || !booking || booking.creatorProfileId !== profile.id) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }

  await cancelBooking(id);
  return NextResponse.json({ ok: true });
}
