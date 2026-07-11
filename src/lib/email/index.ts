import type { EmailAdapter } from "./types";
import { mockEmailAdapter } from "./mock-adapter";

// بريد ترانزاكشنال يُرسَل من aktbot.com.
const FROM = "no-reply@aktbot.com";

// اختيار المزوّد — mock في التطوير؛ SMTP الحقيقي يُضاف هنا لاحقاً حسب EMAIL_PROVIDER.
export function getEmailAdapter(): EmailAdapter {
  return mockEmailAdapter;
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3009"
  );
}

export async function sendVerificationEmail(
  to: string,
  rawToken: string,
): Promise<void> {
  const link = `${appUrl()}/api/auth/verify-email?token=${rawToken}`;
  await getEmailAdapter().send({
    to,
    subject: "AktBot — تأكيد بريدك الإلكتروني",
    text: [
      "مرحباً،",
      "",
      "لتأكيد بريدك الإلكتروني، افتح الرابط التالي (صالح لمدة ساعة واحدة):",
      link,
      "",
      "إن لم تُنشئ حساباً، تجاهل هذه الرسالة.",
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>لتأكيد بريدك الإلكتروني، افتح الرابط التالي (صالح لمدة ساعة واحدة):</p>
<p><a href="${link}">${link}</a></p>
<p style="color:#666">إن لم تُنشئ حساباً، تجاهل هذه الرسالة.<br/>— ${FROM}</p>`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
): Promise<void> {
  const link = `${appUrl()}/reset-password?token=${rawToken}`;
  await getEmailAdapter().send({
    to,
    subject: "AktBot — استعادة كلمة المرور",
    text: [
      "مرحباً،",
      "",
      "لإعادة تعيين كلمة مرورك، افتح الرابط التالي (صالح لمدة 30 دقيقة):",
      link,
      "",
      "إن لم تطلب ذلك، تجاهل هذه الرسالة؛ كلمة مرورك تبقى كما هي.",
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>لإعادة تعيين كلمة مرورك، افتح الرابط التالي (صالح لمدة 30 دقيقة):</p>
<p><a href="${link}">${link}</a></p>
<p style="color:#666">إن لم تطلب ذلك، تجاهل هذه الرسالة.<br/>— ${FROM}</p>`,
  });
}
