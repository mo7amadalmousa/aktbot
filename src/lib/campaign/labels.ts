// ── وسوم UGC/حقوق الاستخدام (آمنة للعميل — بلا prisma) ────────────────
// تُستورَد في مكوّنات client وصفحات server معاً (نفس نمط attribution/labels).

export const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "بانتظار المراجعة",
  APPROVED: "مقبول",
  REJECTED: "مرفوض",
  REVISION_REQUESTED: "طلب تعديل",
};

export const SUBMISSION_TYPE_LABEL: Record<string, string> = {
  VIDEO: "فيديو",
  IMAGE: "صورة",
};

export const USAGE_RIGHT_STATUS_LABEL: Record<string, string> = {
  NOT_REQUESTED: "لم تُطلب",
  REQUESTED: "بانتظار ردّ المبدع",
  ACCEPTED: "مقبولة",
  DECLINED: "مرفوضة",
  EXPIRED: "منتهية",
};

export const USAGE_SCOPE_LABEL: Record<string, string> = {
  ORGANIC: "عضويّ",
  PAID: "إعلان مدفوع",
  WHITELISTING: "Whitelisting / Spark Ads",
};

// القنوات المدعومة لحقوق الاستخدام (مفتاح ثابت + وسم عرض).
export const USAGE_CHANNELS: { key: string; label: string }[] = [
  { key: "meta", label: "Meta (Instagram/Facebook)" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "snapchat", label: "Snapchat" },
  { key: "x", label: "X (Twitter)" },
  { key: "website", label: "الموقع/المتجر" },
];

export const USAGE_CHANNEL_KEYS = USAGE_CHANNELS.map((c) => c.key);

// أسماء القنوات المفعّلة من كائن channels JSON.
export function channelLabels(channels: unknown): string[] {
  if (!channels || typeof channels !== "object") return [];
  const obj = channels as Record<string, unknown>;
  return USAGE_CHANNELS.filter((c) => obj[c.key]).map((c) => c.label);
}
