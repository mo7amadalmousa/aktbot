import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asRecord, str } from "@/lib/public/block-config";
import { sendContactNotification } from "@/lib/email";
import { isLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// نموذج «تواصل معنا» — عامّ (بلا مصادقة). يُخزَّن + يُرسَل بريداً للفريق.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const b = asRecord(body);
  const name = str(b.name).trim().slice(0, 120);
  const email = str(b.email).trim().slice(0, 160);
  const subject = str(b.subject).trim().slice(0, 160) || null;
  const message = str(b.message).trim().slice(0, 4000);
  const localeRaw = str(b.locale);
  const locale = isLocale(localeRaw) ? localeRaw : null;

  if (!name || !EMAIL_RE.test(email) || !message) {
    return NextResponse.json({ ok: false, error: "بيانات ناقصة أو غير صالحة." }, { status: 422 });
  }

  await prisma.contactMessage.create({
    data: { name, email, subject, message, locale },
  });
  await sendContactNotification({ name, email, subject, message, locale }).catch(() => {});

  return NextResponse.json({ ok: true });
}
