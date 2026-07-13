import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { safeHref, parseEmbed } from "@/lib/public/safe-url";
import { isManagedMediaUrl } from "@/lib/storage";
import { isSupportedCurrency, toMinor } from "@/lib/payments/money";
import { isValidPrivateKey } from "@/lib/storage/private-files";

// ── تنقية إدخال المنتج (طبقة خادميّة إلزاميّة) ────────────────────────
// السعر/الرسوم تُخزَّن دائماً كأصغر وحدة (minor). ثلاثة أنواع مُفعّلة الآن:
// DIGITAL (ملف خاصّ) · COURSE (محتوى منفصل عبر الوحدات/الدروس) · PHYSICAL
// (مخزون + رسوم شحن اختياريّة). ملف المنتج مفتاح تخزين خاصّ لا رابط عامّ.

export class ProductError extends Error {}

export type ProductKind = "DIGITAL" | "COURSE" | "PHYSICAL";
const KINDS: ProductKind[] = ["DIGITAL", "COURSE", "PHYSICAL"];

// رابط صورة: managed (/api/media) أو http(s). غيرها → يُسقَط.
function imageUrl(raw: unknown): string | null {
  const s = safeHref(raw);
  if (!s) return null;
  if (isManagedMediaUrl(s)) return s;
  if (/^https?:\/\//.test(s)) return s;
  return null;
}

export interface CleanProductAsset {
  fileKey: string;
  fileName: string;
  size: number;
}

export interface CleanProduct {
  type: ProductKind;
  title: string;
  description: string | null;
  price: number; // minor units
  currency: string;
  images: string[];
  isActive: boolean;
  asset: CleanProductAsset | null; // ملف رقميّ جديد (DIGITAL فقط)
  stock: number | null; // PHYSICAL — null = غير محدود
  shippingFee: number | null; // PHYSICAL — minor units
}

export function sanitizeProductInput(raw: unknown): CleanProduct {
  const c = asRecord(raw);

  const typeRaw = str(c.type).toUpperCase();
  const type: ProductKind = (KINDS as string[]).includes(typeRaw)
    ? (typeRaw as ProductKind)
    : "DIGITAL";

  const title = str(c.title).trim().slice(0, 140);
  if (!title) throw new ProductError("عنوان المنتج مطلوب.");

  const priceMajor = num(c.price);
  if (priceMajor === null || priceMajor <= 0) {
    throw new ProductError("السعر يجب أن يكون رقماً أكبر من صفر.");
  }
  const currency = str(c.currency) || "USD";
  if (!isSupportedCurrency(currency)) {
    throw new ProductError("عملة غير مدعومة (USD أو TRY).");
  }

  const images = arr(c.images)
    .map((u) => imageUrl(u))
    .filter((x): x is string => x !== null)
    .slice(0, 6);

  // ملف رقميّ (DIGITAL): { fileKey, fileName, size } من /api/creator/product-file.
  let asset: CleanProductAsset | null = null;
  const f = c.file;
  if (type === "DIGITAL" && f && typeof f === "object") {
    const r = asRecord(f);
    const fileKey = str(r.fileKey);
    const fileName = str(r.fileName).slice(0, 140) || "ملف";
    const size = num(r.size) ?? 0;
    if (fileKey) {
      if (!isValidPrivateKey(fileKey)) {
        throw new ProductError("مفتاح ملف غير صالح.");
      }
      asset = { fileKey, fileName, size: Math.max(0, Math.floor(size)) };
    }
  }

  // PHYSICAL: مخزون + رسوم شحن (اختياريّان).
  let stock: number | null = null;
  let shippingFee: number | null = null;
  if (type === "PHYSICAL") {
    const s = num(c.stock);
    if (s !== null && s >= 0) stock = Math.floor(s);
    const feeMajor = num(c.shippingFee);
    if (feeMajor !== null && feeMajor > 0) {
      shippingFee = toMinor(feeMajor, currency);
    }
  }

  return {
    type,
    title,
    description: str(c.description).slice(0, 2000) || null,
    price: toMinor(priceMajor, currency),
    currency,
    images,
    isActive: c.isActive !== false,
    asset,
    stock,
    shippingFee,
  };
}

// ── تنقية بنية الكورس (وحدات ← دروس) ─────────────────────────────────
export interface CleanLesson {
  id?: string;
  title: string;
  type: "VIDEO" | "TEXT" | "FILE";
  contentRef: string | null; // نصّ (TEXT) أو رابط تضمين (VIDEO embed)
  assetKey: string | null; // ملف خاصّ (VIDEO upload | FILE)
  assetName: string | null;
  duration: string | null;
}
export interface CleanModule {
  id?: string;
  title: string;
  lessons: CleanLesson[];
}

const LESSON_TYPES = ["VIDEO", "TEXT", "FILE"] as const;

export function sanitizeCourseInput(raw: unknown): CleanModule[] {
  const modules = arr(asRecord(raw).modules)
    .map((m): CleanModule => {
      const r = asRecord(m);
      const lessons = arr(r.lessons)
        .map((l): CleanLesson | null => {
          const lr = asRecord(l);
          const t = str(lr.type).toUpperCase();
          const type = (LESSON_TYPES as readonly string[]).includes(t)
            ? (t as CleanLesson["type"])
            : "TEXT";
          const title = str(lr.title).slice(0, 160).trim();
          if (!title) return null;

          let contentRef: string | null = null;
          let assetKey: string | null = null;
          let assetName: string | null = null;

          if (type === "TEXT") {
            contentRef = str(lr.contentRef).slice(0, 20000) || null;
          } else if (type === "VIDEO") {
            // فيديو مرفوع (assetKey خاصّ) أو تضمين (embed whitelist).
            const key = str(lr.assetKey);
            if (key && isValidPrivateKey(key)) {
              assetKey = key;
              assetName = str(lr.assetName).slice(0, 160) || "video";
            } else {
              const embed = parseEmbed(lr.contentRef);
              contentRef = embed ? str(lr.contentRef) : null;
            }
          } else {
            // FILE — ملف خاصّ فقط.
            const key = str(lr.assetKey);
            if (key && isValidPrivateKey(key)) {
              assetKey = key;
              assetName = str(lr.assetName).slice(0, 160) || "file";
            }
          }

          return {
            id: str(lr.id) || undefined,
            title,
            type,
            contentRef,
            assetKey,
            assetName,
            duration: str(lr.duration).slice(0, 40) || null,
          };
        })
        .filter((x): x is CleanLesson => x !== null)
        .slice(0, 100);

      return {
        id: str(r.id) || undefined,
        title: str(r.title).slice(0, 160).trim() || "وحدة",
        lessons,
      };
    })
    .slice(0, 50);

  return modules;
}
