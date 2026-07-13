import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { safeHref } from "@/lib/public/safe-url";
import { isManagedMediaUrl } from "@/lib/storage";
import { isSupportedCurrency, toMinor } from "@/lib/payments/money";
import { isValidPrivateKey } from "@/lib/storage/private-files";

// ── تنقية إدخال المنتج (طبقة خادميّة إلزاميّة) ────────────────────────
// السعر يُخزَّن دائماً كأصغر وحدة (minor). الآن: DIGITAL فقط (COURSE/PHYSICAL
// موجودة في الـenum لكنها غير مُفعّلة). ملف المنتج مفتاح تخزين خاصّ لا رابط عامّ.

export class ProductError extends Error {}

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
  type: "DIGITAL";
  title: string;
  description: string | null;
  price: number; // minor units
  currency: string;
  images: string[];
  isActive: boolean;
  asset: CleanProductAsset | null; // ملف جديد مرفوع (اختياريّ عند التعديل)
}

export function sanitizeProductInput(raw: unknown): CleanProduct {
  const c = asRecord(raw);

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

  // ملف جديد (اختياريّ): { fileKey, fileName, size } من /api/creator/product-file.
  let asset: CleanProductAsset | null = null;
  const f = c.file;
  if (f && typeof f === "object") {
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

  return {
    type: "DIGITAL",
    title,
    description: str(c.description).slice(0, 2000) || null,
    price: toMinor(priceMajor, currency),
    currency,
    images,
    isActive: c.isActive !== false,
    asset,
  };
}
