import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import {
  generateToken,
  hashToken,
  expiresInMinutes,
  EMAIL_VERIFICATION_TTL_MIN,
} from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";
import {
  normalizeEmail,
  isValidEmail,
  normalizeUsername,
  validateUsername,
  isStrongEnoughPassword,
  MIN_PASSWORD_LENGTH,
} from "@/lib/validation";

export const runtime = "nodejs";

function back(req: NextRequest, error: string) {
  const url = new URL("/signup", req.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const displayName = String(form.get("displayName") ?? "").trim();
  const username = normalizeUsername(String(form.get("username") ?? ""));

  if (!isValidEmail(email)) return back(req, "البريد الإلكتروني غير صالح.");
  if (!isStrongEnoughPassword(password)) {
    return back(req, `كلمة المرور يجب ألا تقلّ عن ${MIN_PASSWORD_LENGTH} أحرف.`);
  }
  if (!displayName) return back(req, "الاسم الظاهر مطلوب.");
  const uv = validateUsername(username);
  if (!uv.ok) return back(req, uv.error);

  // تحقّق تفرّد البريد واسم المستخدم.
  const [emailTaken, usernameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true },
    }),
  ]);
  if (emailTaken) return back(req, "هذا البريد مسجّل مسبقاً.");
  if (usernameTaken) return back(req, "اسم المستخدم مستخدم مسبقاً.");

  const passwordHash = await hashPassword(password);
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "CREATOR",
          creatorProfile: { create: { username, displayName } },
        },
        select: { id: true },
      });
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: expiresInMinutes(EMAIL_VERIFICATION_TTL_MIN),
        },
      });
    });
  } catch {
    // سباق تفرّد نادر أو خطأ قاعدة — رسالة عامّة.
    return back(req, "تعذّر إنشاء الحساب، جرّب ببيانات مختلفة.");
  }

  // إرسال بريد التحقّق (mock: يطبع الرابط في الكونسول).
  await sendVerificationEmail(email, rawToken);

  const url = new URL("/verify-email", req.url);
  url.searchParams.set("sent", "1");
  url.searchParams.set("email", email);
  return NextResponse.redirect(url, { status: 303 });
}
