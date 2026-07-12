import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

// تصدير مشتركي النشرة CSV — ملكيّة session.sub فقط.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true, username: true },
  });
  if (!profile) return NextResponse.json({ ok: false }, { status: 404 });

  const subs = await prisma.newsletterSubscriber.findMany({
    where: { creatorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    select: { email: true, createdAt: true },
  });

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    "email,subscribed_at",
    ...subs.map((s) => `${escape(s.email)},${s.createdAt.toISOString()}`),
  ];
  const csv = rows.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="subscribers-${profile.username}.csv"`,
    },
  });
}
