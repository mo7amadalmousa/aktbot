import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { VARIANT_WIDTHS, type ImageVariant } from "./asset";

// ── أمان ومعالجة الصور ────────────────────────────────────────────────
export class ImageError extends Error {}

export type UploadVariant = ImageVariant;

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

export interface ProcessedSet {
  baseKey: string;
  contentType: "image/webp";
  outputs: { key: string; data: Buffer }[]; // الأساس + متغيّرات @w
  generatedWidths: number[];
}

// يتحقّق ويولّد عدّة أحجام responsive (webp · تنظيف EXIF بإسقاط الميتاداتا).
// الأساس = أكبر عرض (بلا لاحقة)؛ المتغيّرات الأصغر @w. توليد المتغيّرات best-effort:
// فشل حجمٍ لا يُفشل الرفع (يبقى الأساس على الأقلّ).
export async function processImageSet(
  input: Buffer,
  variant: UploadVariant,
): Promise<ProcessedSet> {
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

  const widths = VARIANT_WIDTHS[variant];
  const maxW = widths[widths.length - 1];
  const id = randomUUID();
  const baseKey = `${id}.webp`;

  async function render(w: number, quality: number): Promise<Buffer> {
    return sharp(input)
      .rotate() // توجيه تلقائيّ من EXIF قبل إسقاطها
      .resize(w, w, { fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  }

  // الأساس مطلوب.
  let baseData: Buffer;
  try {
    baseData = await render(maxW, 82);
  } catch {
    throw new ImageError("تعذّرت معالجة الصورة.");
  }

  const outputs: { key: string; data: Buffer }[] = [
    { key: baseKey, data: baseData },
  ];
  const generatedWidths: number[] = [maxW];

  // المتغيّرات الأصغر — best-effort.
  for (const w of widths.slice(0, -1)) {
    try {
      const d = await render(w, 80);
      outputs.push({ key: `${id}@${w}.webp`, data: d });
      generatedWidths.push(w);
    } catch {
      // تخطّي هذا الحجم دون إفشال الرفع.
    }
  }

  return { baseKey, contentType: "image/webp", outputs, generatedWidths };
}
