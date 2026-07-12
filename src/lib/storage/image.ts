import { randomUUID } from "node:crypto";
import sharp from "sharp";

// ── أمان ومعالجة الصور ────────────────────────────────────────────────
export class ImageError extends Error {}

export type UploadVariant = "avatar" | "background" | "gallery";

const MAX_DIM: Record<UploadVariant, number> = {
  avatar: 512,
  background: 1920,
  gallery: 1400,
};

export function maxUploadBytes(): number {
  const n = Number(process.env.UPLOAD_MAX_BYTES);
  return Number.isFinite(n) && n > 0 ? n : 8 * 1024 * 1024; // 8MB افتراضيّاً
}

// كشف النوع الفعليّ من magic bytes — صور فقط (jpeg/png/webp).
function detectImageType(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "png";
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  return null;
}

export interface ProcessedImage {
  key: string;
  data: Buffer;
  contentType: "image/webp";
}

// يتحقّق ويعالج: تصغير + ضغط + webp + تنظيف EXIF (sharp يُسقط الميتاداتا افتراضياً).
export async function processImage(
  input: Buffer,
  variant: UploadVariant,
): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageError("ملف فارغ.");
  if (input.length > maxUploadBytes()) {
    throw new ImageError(
      `حجم الملف يتجاوز الحدّ (${Math.round(maxUploadBytes() / (1024 * 1024))}MB).`,
    );
  }

  const type = detectImageType(input);
  if (!type) {
    throw new ImageError("الملف ليس صورة صالحة (JPEG/PNG/WebP فقط).");
  }

  const dim = MAX_DIM[variant];
  let data: Buffer;
  try {
    data = await sharp(input)
      .rotate() // توجيه تلقائيّ من EXIF قبل إسقاطها
      .resize(dim, dim, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ImageError("تعذّرت معالجة الصورة.");
  }

  return {
    key: `${randomUUID()}.webp`,
    data,
    contentType: "image/webp",
  };
}
