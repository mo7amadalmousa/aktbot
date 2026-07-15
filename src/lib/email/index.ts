import type { EmailAdapter } from "./types";
import { mockEmailAdapter } from "./mock-adapter";
import { formatFullInTz } from "@/lib/booking/time";

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

// ── وصول الكورس (بعد نجاح الدفع) ──────────────────────────────────────
interface CourseAccessData {
  buyerName: string;
  buyerEmail: string;
  courseTitle: string;
  amountLabel: string;
  creatorName: string;
}

// رابط الوصول يُبنى من التوكن الخام — لا يُخزَّن خاماً (sha256 فقط).
export async function sendCourseAccessEmail(
  data: CourseAccessData,
  rawToken: string,
): Promise<void> {
  const link = `${appUrl()}/learn/${rawToken}`;
  await getEmailAdapter().send({
    to: data.buyerEmail,
    subject: `AktBot — وصولك لكورس «${data.courseTitle}»`,
    text: [
      `مرحباً ${data.buyerName}،`,
      "",
      `تمّ الدفع بنجاح لكورس «${data.courseTitle}» لدى ${data.creatorName}.`,
      `المبلغ: ${data.amountLabel}`,
      "",
      "رابط الوصول الخاصّ بك (احتفظ به — لا تشاركه):",
      link,
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>مرحباً ${data.buyerName}،</p>
<p>تمّ الدفع بنجاح لكورس «<strong>${data.courseTitle}</strong>» لدى ${data.creatorName}.</p>
<p>المبلغ: <strong>${data.amountLabel}</strong></p>
<p>رابط الوصول الخاصّ بك (احتفظ به — لا تشاركه):</p>
<p><a href="${link}">ابدأ الكورس</a></p>
<p style="color:#666">— ${FROM}</p>`,
  });
}

interface CourseSaleData {
  creatorName: string;
  courseTitle: string;
  buyerName: string;
  buyerEmail: string;
  amountLabel: string;
}

export async function sendCourseSaleNotification(
  creatorEmail: string,
  data: CourseSaleData,
): Promise<void> {
  await getEmailAdapter().send({
    to: creatorEmail,
    subject: `AktBot — التحاق جديد بالكورس: ${data.courseTitle}`,
    text: [
      `مرحباً ${data.creatorName}،`,
      "",
      `التحق مشترٍ جديد بكورس «${data.courseTitle}».`,
      `المشتري: ${data.buyerName} <${data.buyerEmail}>`,
      `المبلغ: ${data.amountLabel}`,
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>مرحباً ${data.creatorName}،</p>
<p>التحق مشترٍ جديد بكورس «<strong>${data.courseTitle}</strong>».</p>
<p>المشتري: ${data.buyerName} &lt;${data.buyerEmail}&gt;<br/>المبلغ: <strong>${data.amountLabel}</strong></p>
<p style="color:#666">— ${FROM}</p>`,
  });
}

// ── المنتج الفيزيائيّ (بعد نجاح الدفع + تحديثات الشحن) ────────────────
interface PhysicalConfirmData {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  amountLabel: string;
  creatorName: string;
}

export async function sendPhysicalOrderConfirmation(
  data: PhysicalConfirmData,
): Promise<void> {
  const track = `${appUrl()}/track/${data.orderId}?e=${encodeURIComponent(
    data.buyerEmail,
  )}`;
  await getEmailAdapter().send({
    to: data.buyerEmail,
    subject: `AktBot — تأكيد طلبك: ${data.productTitle}`,
    text: [
      `مرحباً ${data.buyerName}،`,
      "",
      `تمّ الدفع بنجاح لطلب «${data.productTitle}» لدى ${data.creatorName}.`,
      `المبلغ (شامل الشحن): ${data.amountLabel}`,
      "",
      "سيُجهّز المبدع طلبك ويشحنه. تابع حالة الشحن عبر:",
      track,
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>مرحباً ${data.buyerName}،</p>
<p>تمّ الدفع بنجاح لطلب «<strong>${data.productTitle}</strong>» لدى ${data.creatorName}.</p>
<p>المبلغ (شامل الشحن): <strong>${data.amountLabel}</strong></p>
<p>سيُجهّز المبدع طلبك ويشحنه. تابع حالة الشحن عبر:</p>
<p><a href="${track}">متابعة الطلب</a></p>
<p style="color:#666">— ${FROM}</p>`,
  });
}

interface ShippingAddr {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  line: string;
  postalCode: string | null;
}

interface PhysicalSaleData {
  creatorName: string;
  productTitle: string;
  buyerName: string;
  buyerEmail: string;
  amountLabel: string;
  shipping: ShippingAddr | null;
}

export async function sendPhysicalSaleNotification(
  creatorEmail: string,
  data: PhysicalSaleData,
): Promise<void> {
  const a = data.shipping;
  const addrText = a
    ? [
        `المستلم: ${a.fullName} · ${a.phone}`,
        `العنوان: ${a.line}، ${a.city}، ${a.country}${
          a.postalCode ? ` (${a.postalCode})` : ""
        }`,
      ].join("\n")
    : "";
  await getEmailAdapter().send({
    to: creatorEmail,
    subject: `AktBot — طلب فيزيائيّ جديد: ${data.productTitle}`,
    text: [
      `مرحباً ${data.creatorName}،`,
      "",
      `لديك طلب فيزيائيّ جديد مدفوع: «${data.productTitle}».`,
      `المشتري: ${data.buyerName} <${data.buyerEmail}>`,
      `المبلغ: ${data.amountLabel}`,
      addrText,
      "",
      "جهّز الطلب وحدّث حالته من لوحة التحكّم.",
      `— ${FROM}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `<p>مرحباً ${data.creatorName}،</p>
<p>لديك طلب فيزيائيّ جديد مدفوع: «<strong>${data.productTitle}</strong>».</p>
<p>المشتري: ${data.buyerName} &lt;${data.buyerEmail}&gt;<br/>المبلغ: <strong>${data.amountLabel}</strong></p>
${a ? `<p>المستلم: ${a.fullName} · ${a.phone}<br/>العنوان: ${a.line}، ${a.city}، ${a.country}${a.postalCode ? ` (${a.postalCode})` : ""}</p>` : ""}
<p style="color:#666">جهّز الطلب وحدّث حالته من لوحة التحكّم.<br/>— ${FROM}</p>`,
  });
}

interface ShipmentUpdateData {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  statusLabel: string;
  trackingNumber: string | null;
}

export async function sendShipmentUpdateEmail(
  data: ShipmentUpdateData,
): Promise<void> {
  const track = `${appUrl()}/track/${data.orderId}?e=${encodeURIComponent(
    data.buyerEmail,
  )}`;
  await getEmailAdapter().send({
    to: data.buyerEmail,
    subject: `AktBot — تحديث شحن طلبك: ${data.productTitle}`,
    text: [
      `مرحباً ${data.buyerName}،`,
      "",
      `تحدّثت حالة طلب «${data.productTitle}» إلى: ${data.statusLabel}.`,
      data.trackingNumber ? `رقم التتبّع: ${data.trackingNumber}` : "",
      "",
      "تفاصيل الطلب:",
      track,
      `— ${FROM}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `<p>مرحباً ${data.buyerName}،</p>
<p>تحدّثت حالة طلب «<strong>${data.productTitle}</strong>» إلى: <strong>${data.statusLabel}</strong>.</p>
${data.trackingNumber ? `<p>رقم التتبّع: <strong>${data.trackingNumber}</strong></p>` : ""}
<p><a href="${track}">تفاصيل الطلب</a></p>
<p style="color:#666">— ${FROM}</p>`,
  });
}

// ── UGC: مراجعة المحتوى + طلب حقوق الاستخدام ──────────────────────────
interface SubmissionReviewData {
  creatorName: string;
  creatorEmail: string;
  campaignTitle: string;
  brandName: string;
  statusLabel: string; // مقبول | مرفوض | طلب تعديل
  note: string | null;
  payoutLabel: string | null; // مستحقّ المحتوى عند القبول
}

export async function sendSubmissionReviewedEmail(
  data: SubmissionReviewData,
): Promise<void> {
  await getEmailAdapter().send({
    to: data.creatorEmail,
    subject: `AktBot — نتيجة مراجعة محتواك: ${data.campaignTitle}`,
    text: [
      `مرحباً ${data.creatorName}،`,
      "",
      `راجعت «${data.brandName}» محتواك في حملة «${data.campaignTitle}».`,
      `النتيجة: ${data.statusLabel}.`,
      data.payoutLabel ? `مستحقّك عن هذا المحتوى: ${data.payoutLabel}.` : "",
      data.note ? `ملاحظة العلامة: ${data.note}` : "",
      "",
      "راجع حملاتك من لوحة التحكّم.",
      `— ${FROM}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `<p>مرحباً ${data.creatorName}،</p>
<p>راجعت «<strong>${data.brandName}</strong>» محتواك في حملة «<strong>${data.campaignTitle}</strong>».</p>
<p>النتيجة: <strong>${data.statusLabel}</strong>.${data.payoutLabel ? `<br/>مستحقّك عن هذا المحتوى: <strong>${data.payoutLabel}</strong>.` : ""}${data.note ? `<br/>ملاحظة العلامة: ${data.note}` : ""}</p>
<p style="color:#666">راجع حملاتك من لوحة التحكّم.<br/>— ${FROM}</p>`,
  });
}

interface UsageRightRequestData {
  creatorName: string;
  creatorEmail: string;
  campaignTitle: string;
  brandName: string;
  feeLabel: string;
  durationDays: number;
  scopeLabel: string;
}

export async function sendUsageRightRequestEmail(
  data: UsageRightRequestData,
): Promise<void> {
  await getEmailAdapter().send({
    to: data.creatorEmail,
    subject: `AktBot — طلب حقوق استخدام: ${data.campaignTitle}`,
    text: [
      `مرحباً ${data.creatorName}،`,
      "",
      `طلبت «${data.brandName}» حقوق استخدام لمحتواك في حملة «${data.campaignTitle}».`,
      `الأجر: ${data.feeLabel} · المدّة: ${data.durationDays} يوماً · النطاق: ${data.scopeLabel}.`,
      "",
      "راجع الطلب واقبله أو ارفضه من لوحة التحكّم — أنت ترى الشروط كاملة قبل القبول.",
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>مرحباً ${data.creatorName}،</p>
<p>طلبت «<strong>${data.brandName}</strong>» حقوق استخدام لمحتواك في حملة «<strong>${data.campaignTitle}</strong>».</p>
<p>الأجر: <strong>${data.feeLabel}</strong> · المدّة: <strong>${data.durationDays}</strong> يوماً · النطاق: ${data.scopeLabel}.</p>
<p style="color:#666">راجع الطلب واقبله أو ارفضه من لوحة التحكّم.<br/>— ${FROM}</p>`,
  });
}

// ── حجز المواعيد (تأكيد/إلغاء) ────────────────────────────────────────
interface BookingEmailData {
  bookingId: string;
  buyerName: string;
  buyerEmail: string;
  creatorName: string;
  startISO: string;
  endISO: string;
  timezone: string;
  isPaid: boolean;
  meetingType: string; // online | in_person
  meetingLink: string | null;
}

function bookingLinks(data: { bookingId: string; buyerEmail: string }) {
  const e = encodeURIComponent(data.buyerEmail);
  return {
    view: `${appUrl()}/booking/${data.bookingId}?e=${e}`,
    ics: `${appUrl()}/api/bookings/${data.bookingId}/ics?e=${e}`,
  };
}

export async function sendBookingConfirmationBuyer(
  data: BookingEmailData,
): Promise<void> {
  const when = formatFullInTz(data.startISO, data.timezone);
  const { view, ics } = bookingLinks(data);
  const meetLine =
    data.meetingType === "online"
      ? data.meetingLink
        ? `رابط اللقاء: ${data.meetingLink}`
        : "لقاء أونلاين — سيصلك الرابط قبل الموعد."
      : "لقاء حضوريّ — سيتواصل معك المبدع بالتفاصيل.";
  await getEmailAdapter().send({
    to: data.buyerEmail,
    subject: `AktBot — تأكيد موعدك مع ${data.creatorName}`,
    text: [
      `مرحباً ${data.buyerName}،`,
      "",
      `تأكّد حجز موعدك مع ${data.creatorName}.`,
      `الموعد: ${when}`,
      meetLine,
      data.isPaid ? "الحالة: مدفوع." : "الحالة: مجانيّ.",
      "",
      `التفاصيل: ${view}`,
      `أضِفه لتقويمك (ICS): ${ics}`,
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>مرحباً ${data.buyerName}،</p>
<p>تأكّد حجز موعدك مع <strong>${data.creatorName}</strong>.</p>
<p>الموعد: <strong>${when}</strong><br/>${meetLine}<br/>${data.isPaid ? "الحالة: مدفوع." : "الحالة: مجانيّ."}</p>
<p><a href="${view}">تفاصيل الموعد</a> · <a href="${ics}">أضِفه لتقويمك (ICS)</a></p>
<p style="color:#666">— ${FROM}</p>`,
  });
}

export async function sendBookingConfirmationCreator(
  creatorEmail: string,
  data: BookingEmailData,
): Promise<void> {
  const when = formatFullInTz(data.startISO, data.timezone);
  await getEmailAdapter().send({
    to: creatorEmail,
    subject: `AktBot — موعد جديد: ${data.buyerName}`,
    text: [
      `مرحباً ${data.creatorName}،`,
      "",
      `لديك موعد جديد مؤكّد.`,
      `العميل: ${data.buyerName} <${data.buyerEmail}>`,
      `الموعد: ${when}`,
      data.meetingType === "online" ? "النوع: أونلاين" : "النوع: حضوريّ",
      data.isPaid ? "مدفوع." : "مجانيّ.",
      "",
      "راجع مواعيدك من لوحة التحكّم.",
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>مرحباً ${data.creatorName}،</p>
<p>لديك موعد جديد مؤكّد.</p>
<p>العميل: ${data.buyerName} &lt;${data.buyerEmail}&gt;<br/>الموعد: <strong>${when}</strong><br/>${data.meetingType === "online" ? "أونلاين" : "حضوريّ"} · ${data.isPaid ? "مدفوع" : "مجانيّ"}</p>
<p style="color:#666">راجع مواعيدك من لوحة التحكّم.<br/>— ${FROM}</p>`,
  });
}

interface BookingCancelData {
  buyerName: string;
  buyerEmail: string;
  creatorName: string;
  creatorEmail: string | null;
  startISO: string;
  timezone: string;
  isPaid: boolean;
}

export async function sendBookingCancellation(
  data: BookingCancelData,
): Promise<void> {
  const when = formatFullInTz(data.startISO, data.timezone);
  const refundNote = data.isPaid
    ? " إن كان مدفوعاً، سيتواصل معك المبدع بخصوص الاسترداد."
    : "";
  await getEmailAdapter().send({
    to: data.buyerEmail,
    subject: `AktBot — إلغاء موعدك مع ${data.creatorName}`,
    text: [
      `مرحباً ${data.buyerName}،`,
      "",
      `أُلغي موعدك (${when}) مع ${data.creatorName}.${refundNote}`,
      `— ${FROM}`,
    ].join("\n"),
    html: `<p>مرحباً ${data.buyerName}،</p>
<p>أُلغي موعدك (<strong>${when}</strong>) مع ${data.creatorName}.${refundNote}</p>
<p style="color:#666">— ${FROM}</p>`,
  });
  if (data.creatorEmail) {
    await getEmailAdapter().send({
      to: data.creatorEmail,
      subject: `AktBot — أُلغي موعد: ${data.buyerName}`,
      text: [
        `مرحباً ${data.creatorName}،`,
        "",
        `أُلغي موعد ${data.buyerName} (${when}). تحرّر الموعد.`,
        `— ${FROM}`,
      ].join("\n"),
      html: `<p>مرحباً ${data.creatorName}،</p><p>أُلغي موعد ${data.buyerName} (<strong>${when}</strong>). تحرّر الموعد.</p><p style="color:#666">— ${FROM}</p>`,
    });
  }
}
