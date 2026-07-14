import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { acceptParticipation } from "@/lib/attribution/engine";

export const runtime = "nodejs";

// قبول المبدع لدعوة حملة → participation ACTIVE (يُفعّل الإسناد). ملكية · idempotent.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  const { id } = await params;

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ ok: false, error: "لا يوجد ملف." }, { status: 404 });

  const res = await acceptParticipation(id, profile.id);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, code: res.code, link: res.link });
}
