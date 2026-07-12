// ── طبقة الأصول: CDN قابل للتوجيه + أحجام responsive ──────────────────
// client-safe (بلا sharp/fs). يستخدمها الرفع (توليد المفاتيح) والعرض (srcset).

export type ImageVariant = "avatar" | "background" | "gallery";

// عروض كل نوع (تصاعديّاً · الأخير = الأساس بلا لاحقة @).
export const VARIANT_WIDTHS: Record<ImageVariant, number[]> = {
  avatar: [128, 256, 512],
  background: [640, 1024, 1600],
  gallery: [320, 640, 1024, 1400],
};

// sizes الافتراضيّة لكل سياق (تمنع تحميل حجم أكبر من اللازم).
export const DEFAULT_SIZES: Record<ImageVariant, string> = {
  avatar: "96px",
  background: "100vw",
  gallery: "(max-width: 640px) 45vw, 300px",
};

// اتحاد كل العروض — لحذف كل المتغيّرات عند حذف الأصل.
const ALL_WIDTHS = Array.from(
  new Set(Object.values(VARIANT_WIDTHS).flat()),
).sort((a, b) => a - b);

// مسارات التخزين المُدارة (LocalAdapter=/api/media · VpsAdapter=/media).
export function isManagedPath(url: string): boolean {
  return url.startsWith("/api/media/") || url.startsWith("/media/");
}

function cdnBase(): string {
  return (process.env.NEXT_PUBLIC_CDN_BASE_URL || "").replace(/\/$/, "");
}

// رابط العرض النهائيّ — عبر CDN إن ضُبط، وإلا من المصدر (تطوير).
// كل صورة تمرّ من هنا — لا تُخدَم من الأصل مباشرةً في الإنتاج.
export function assetUrl(url: string): string {
  if (!url) return url;
  if (!isManagedPath(url)) return url; // رابط خارجيّ (unsplash/قديم) — كما هو
  const base = cdnBase();
  return base ? `${base}${url}` : url;
}

// رابط متغيّر بعرض w (يدرج @w قبل .webp). للمسارات المُدارة فقط.
export function variantUrl(url: string, w: number): string {
  if (!isManagedPath(url)) return url;
  return url.replace(/\.webp$/, `@${w}.webp`);
}

// كل مفاتيح متغيّرات أصل (الأساس + @w لكل العروض) — للحذف الكامل.
export function allVariantKeys(baseKey: string): string[] {
  const id = baseKey.replace(/\.webp$/, "");
  return [baseKey, ...ALL_WIDTHS.map((w) => `${id}@${w}.webp`)];
}

// المفتاح الأساس من مفتاح متغيّر (uuid@640.webp → uuid.webp).
export function baseKeyOf(key: string): string {
  return key.replace(/@\d+\.webp$/, ".webp");
}
