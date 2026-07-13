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

// ── رسائل الطلبات (بعد نجاح الدفع) ────────────────────────────────────
interface OrderEmailData {
  buyerName: string;
  buyerEmail: string;
  itemTitle: string;
  amountLabel: string;
  kindLabel: string; // "استشارة" | "فيديو خاص"
  instructions?: string;
  creatorName: string;
}

export async function sendOrderBuyerConfirmation(
  data: OrderEmailData,
): Promise<void> {
  await getEmailAdapter().send({
    to: data.buyerEmail,
    subject: `AktBot — تأكيد طلبك: ${data.itemTitle}`,
    text: [
      `مرحباً ${data.buyerName}،`,
      "",
      `تم استلام دفعتك بنجاح لـ«${data.itemTitle}» (${data.kindLabel}) لدى ${data.creatorName}.`,
      `المبلغ: ${data.amountLabel}`,
      "",
      "سيتواصل معك المبدع لإتمام التفاصيل. شكراً لك.",
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>مرحباً ${data.buyerName}،</p>
<p>تم استلام دفعتك بنجاح لـ«<strong>${data.itemTitle}</strong>» (${data.kindLabel}) لدى ${data.creatorName}.</p>
<p>المبلغ: <strong>${data.amountLabel}</strong></p>
<p style="color:#666">سيتواصل معك المبدع لإتمام التفاصيل.<br/>— ${FROM}</p>`,
  });
}

export async function sendOrderCreatorNotification(
  creatorEmail: string,
  data: OrderEmailData,
): Promise<void> {
  await getEmailAdapter().send({
    to: creatorEmail,
    subject: `AktBot — طلب جديد: ${data.itemTitle}`,
    text: [
      `مرحباً ${data.creatorName}،`,
      "",
      `لديك طلب جديد مدفوع: «${data.itemTitle}» (${data.kindLabel}).`,
      `المشتري: ${data.buyerName} <${data.buyerEmail}>`,
      `المبلغ: ${data.amountLabel}`,
      data.instructions ? `تعليمات المشتري: ${data.instructions}` : "",
      "",
      "راجع طلباتك من لوحة التحكّم.",
      `— ${FROM}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `<p>مرحباً ${data.creatorName}،</p>
<p>لديك طلب جديد مدفوع: «<strong>${data.itemTitle}</strong>» (${data.kindLabel}).</p>
<p>المشتري: ${data.buyerName} &lt;${data.buyerEmail}&gt;<br/>المبلغ: <strong>${data.amountLabel}</strong>${
      data.instructions
        ? `<br/>تعليمات المشتري: ${data.instructions}`
        : ""
    }</p>
<p style="color:#666">راجع طلباتك من لوحة التحكّم.<br/>— ${FROM}</p>`,
  });
}

// ── تسليم المنتج الرقميّ (بعد نجاح الدفع) ─────────────────────────────
interface ProductDeliveryData {
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  fileName: string;
  amountLabel: string;
  creatorName: string;
  expiresDays: number;
  maxDownloads: number;
}

// رابط التحميل يُبنى هنا من التوكن الخام — لا يُخزَّن التوكن الخام في القاعدة.
export async function sendProductDeliveryEmail(
  data: ProductDeliveryData,
  rawToken: string,
): Promise<void> {
  const link = `${appUrl()}/api/download/${rawToken}`;
  await getEmailAdapter().send({
    to: data.buyerEmail,
    subject: `AktBot — تحميل «${data.productTitle}»`,
    text: [
      `مرحباً ${data.buyerName}،`,
      "",
      `تمّ الدفع بنجاح لـ«${data.productTitle}» لدى ${data.creatorName}.`,
      `المبلغ: ${data.amountLabel}`,
      "",
      "رابط التحميل الخاصّ بك (لا تشاركه):",
      link,
      "",
      `الرابط صالح ${data.expiresDays} يوماً وحتى ${data.maxDownloads} مرّات تحميل.`,
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>مرحباً ${data.buyerName}،</p>
<p>تمّ الدفع بنجاح لـ«<strong>${data.productTitle}</strong>» لدى ${data.creatorName}.</p>
<p>المبلغ: <strong>${data.amountLabel}</strong></p>
<p>رابط التحميل الخاصّ بك (لا تشاركه):</p>
<p><a href="${link}">تحميل «${data.productTitle}»</a></p>
<p style="color:#666">الرابط صالح ${data.expiresDays} يوماً وحتى ${data.maxDownloads} مرّات تحميل.<br/>— ${FROM}</p>`,
  });
}

interface ProductSaleData {
  creatorName: string;
  productTitle: string;
  buyerName: string;
  buyerEmail: string;
  amountLabel: string;
}

export async function sendProductSaleNotification(
  creatorEmail: string,
  data: ProductSaleData,
): Promise<void> {
  await getEmailAdapter().send({
    to: creatorEmail,
    subject: `AktBot — بيع جديد: ${data.productTitle}`,
    text: [
      `مرحباً ${data.creatorName}،`,
      "",
      `بِعتَ منتجاً رقميّاً: «${data.productTitle}».`,
      `المشتري: ${data.buyerName} <${data.buyerEmail}>`,
      `المبلغ: ${data.amountLabel}`,
      "",
      "راجع مبيعاتك من لوحة التحكّم.",
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>مرحباً ${data.creatorName}،</p>
<p>بِعتَ منتجاً رقميّاً: «<strong>${data.productTitle}</strong>».</p>
<p>المشتري: ${data.buyerName} &lt;${data.buyerEmail}&gt;<br/>المبلغ: <strong>${data.amountLabel}</strong></p>
<p style="color:#666">راجع مبيعاتك من لوحة التحكّم.<br/>— ${FROM}</p>`,
  });
}
