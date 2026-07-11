import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateToken,
  hashToken,
  expiresInMinutes,
  PASSWORD_RESET_TTL_MIN,
} from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { normalizeEmail, isValidEmail } from "@/lib/validation";

export const runtime = "nodejs";

// استجابة موحّدة دائماً — لا تكشف إن كان البريد مسجّلاً (منع تعداد الحسابات).
function uniformDone(req: NextRequest) {
  const url = new URL("/forgot-password", req.url);
  url.searchParams.set("sent", "1");
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));

  // حتى مع بريد غير صالح شكلياً، نرجع نفس الاستجابة الموحّدة.
  if (isValidEmail(email)) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (user) {
      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);
      // إبطال أي توكنات استعادة سابقة ثمّ إنشاء توكن جديد.
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: expiresInMinutes(PASSWORD_RESET_TTL_MIN),
          },
        }),
      ]);
      await sendPasswordResetEmail(email, rawToken);
    }
  }

  return uniformDone(req);
}
