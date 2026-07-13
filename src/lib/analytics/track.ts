// ── أدوات التحليلات (تصنيف المصدر + مفتاح اليوم) ──────────────────────
// لا PII — نصنّف المصدر إلى ثلاث فئات فقط ولا نخزّن الرابط الكامل.

export type Source = "direct" | "social" | "other";

const SOCIAL_HOSTS = [
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "twitter.com",
  "x.com",
  "t.co",
  "facebook.com",
  "fb.com",
  "linkedin.com",
  "lnkd.in",
  "snapchat.com",
  "pinterest.com",
  "wa.me",
  "whatsapp.com",
  "telegram.org",
  "t.me",
  "reddit.com",
];

// يصنّف مصدر الزيارة من الـreferrer (مقارنةً بمضيف الموقع نفسه).
export function classifyReferrer(
  referrer: string | null | undefined,
  selfHost: string | null | undefined,
): Source {
  if (!referrer) return "direct";
  let host: string;
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "direct";
  }
  const self = (selfHost ?? "").split(":")[0].replace(/^www\./, "").toLowerCase();
  if (self && host === self) return "direct"; // تنقّل داخليّ
  if (SOCIAL_HOSTS.some((s) => host === s || host.endsWith(`.${s}`))) return "social";
  return "other";
}

// مفتاح اليوم (UTC) للتجميع.
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// آخر N يوماً كمصفوفة YYYY-MM-DD (تصاعديّ) — لملء الفجوات في الرسم.
export function lastNDates(n: number): string[] {
  const out: string[] = [];
  const base = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(base - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}
