import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import { isStrongEnoughPassword, MIN_PASSWORD_LENGTH } from "@/lib/validation";

export const runtime = "nodejs";

function backToReset(req: NextRequest, token: string, error: string) {
  const url = new URL("/reset-password", req.url);
  if (token) url.searchParams.set("token", token);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const rawToken = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");

  if (!rawToken) {
    const url = new URL("/forgot-password", req.url);
    url.searchParams.set("error", "رابط الاستعادة غير صالح.");
    return NextResponse.redirect(url, { status: 303 });
  }
  if (!isStrongEnoughPassword(password)) {
    return backToReset(
      req,
      rawToken,
      `كلمة المرور يجب ألا تقلّ عن ${MIN_PASSWORD_LENGTH} أحرف.`,
    );
  }

  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    const url = new URL("/forgot-password", req.url);
    url.searchParams.set("error", "رابط الاستعادة غير صالح.");
    return NextResponse.redirect(url, { status: 303 });
  }

  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
    const url = new URL("/forgot-password", req.url);
    url.searchParams.set("error", "انتهت صلاحية رابط الاستعادة، أعد الطلب.");
    return NextResponse.redirect(url, { status: 303 });
  }

  const passwordHash = await hashPassword(password);

  // تحديث كلمة المرور + إبطال كل توكنات الاستعادة (استخدام مرّة واحدة).
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  const url = new URL("/login", req.url);
  url.searchParams.set("reset", "1");
  return NextResponse.redirect(url, { status: 303 });
}
