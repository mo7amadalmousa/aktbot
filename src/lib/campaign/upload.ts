import { writePrivateFile, makePrivateKey } from "@/lib/storage/private-files";
import { sniffMedia, maxUgcBytes, type MediaKind } from "@/lib/campaign/media";
import { sanitizeCaption } from "@/lib/campaign/ugc-input";

// ── قراءة رفع UGC إلى التخزين الخاصّ (لا رابط عام) ─────────────────────
// يتحقّق: الحجم (حدّ أعلى للفيديو) · النوع الفعليّ عبر magic bytes (لا الامتداد).
// الملف يبقى خاصّاً دائماً؛ يُسلَّم فقط عبر مسار محميّ.

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface UploadedUgc {
  assetKey: string;
  type: MediaKind;
  caption: string | null;
}

export async function readUgcUpload(form: FormData): Promise<UploadedUgc> {
  const file = form.get("file");
  const caption = sanitizeCaption(form.get("caption"));
  if (!file || typeof file === "string" || typeof (file as File).arrayBuffer !== "function") {
    throw new UploadError("لا ملف.", 400);
  }
  const f = file as File;

  // حدّ أوّليّ متساهل (أكبر الحدّين) قبل القراءة، ثم تحقّق دقيق بعد الاستنباط.
  const preMax = Math.max(maxUgcBytes("VIDEO"), maxUgcBytes("IMAGE"));
  if (f.size > preMax) {
    throw new UploadError(`الملف كبير جداً (الحدّ ${mb(preMax)}MB).`, 413);
  }

  const buffer = Buffer.from(await f.arrayBuffer());
  if (buffer.byteLength === 0) throw new UploadError("ملف فارغ.", 400);

  const sniff = sniffMedia(buffer);
  if (!sniff) throw new UploadError("نوع ملف غير مدعوم (صورة أو فيديو فقط).", 415);

  const max = maxUgcBytes(sniff.kind);
  if (buffer.byteLength > max) {
    throw new UploadError(`الملف كبير جداً (الحدّ ${mb(max)}MB).`, 413);
  }

  // المفتاح عشوائيّ بامتداد قانونيّ من الاستنباط (لنوع المحتوى الصحيح عند البثّ).
  const assetKey = makePrivateKey(`ugc.${sniff.ext}`);
  await writePrivateFile(assetKey, buffer);
  return { assetKey, type: sniff.kind, caption };
}

function mb(bytes: number): number {
  return Math.floor(bytes / (1024 * 1024));
}
