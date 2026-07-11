import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";

export const runtime = "nodejs";

function toLogin(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/login", req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 });
}

// رابط التحقّق من البريد (GET). استخدام مرّة واحدة: يُحذف التوكن بعد الاستهلاك.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("token");
  if (!raw) return toLogin(req, { error: "رابط تحقّق غير صالح." });

  const tokenHash = hashToken(raw);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record) return toLogin(req, { error: "رابط التحقّق غير صالح." });

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return toLogin(req, { error: "انتهت صلاحية رابط التحقّق، أعد الطلب." });
  }

  // تأكيد البريد + إبطال كل توكنات التحقّق لهذا المستخدم (استخدام مرّة واحدة).
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: { userId: record.userId },
    }),
  ]);

  return toLogin(req, { verified: "1" });
}
