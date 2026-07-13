import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { asRecord, str } from "@/lib/public/block-config";
import { safeHref } from "@/lib/public/safe-url";
import { signSession, SESSION_COOKIE } from "@/lib/auth-edge";
import { sessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";

// تفعيل دور العلامة للمستخدم الحاليّ: إنشاء BrandProfile + ترقية الدور إلى BRAND +
// إعادة إصدار الجلسة بالدور الجديد (لا حاجة لإعادة دخول).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const b = asRecord(body);
  const brandName = str(b.brandName).trim().slice(0, 120);
  if (!brandName) {
    return NextResponse.json({ ok: false, error: "اسم العلامة مطلوب." }, { status: 422 });
  }
  const website = safeHref(b.website);
  const contactEmail = str(b.contactEmail).trim().slice(0, 160) || null;

  const existing = await prisma.brandProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.brandProfile.create({
        data: {
          userId: session.sub,
          brandName,
          website: website && /^https?:\/\//.test(website) ? website : null,
          contactEmail,
          description: str(b.description).slice(0, 600) || null,
        },
      }),
      prisma.user.update({ where: { id: session.sub }, data: { role: "BRAND" } }),
    ]);
  } else {
    // موجودة → تأكيد الدور فقط.
    await prisma.user.update({ where: { id: session.sub }, data: { role: "BRAND" } });
  }

  // إعادة إصدار الجلسة بالدور BRAND فوراً.
  const token = await signSession({ sub: session.sub, email: session.email, role: "BRAND" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
