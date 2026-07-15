import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { Readable } from "node:stream";
import {
  ensurePrivateDir,
  makePrivateKey,
  privatePath,
  renamePrivate,
  deletePrivateFile,
} from "@/lib/storage/private-files";
import { sniffMedia, maxUgcBytes, type MediaKind } from "@/lib/campaign/media";

// ── رفع متدفّق للتخزين الخاصّ (بلا تمرير الملف عبر ذاكرة Next) ─────────
// يُكتَب مباشرةً لقرص VPS chunk-by-chunk (backpressure) · فحص magic bytes من
// الترويسة · حدّ حجم حسب النوع أثناء التدفّق (فيديو أعلى) · لا رابط عام أبداً.
// المستأنَف/التقطيع (tus/chunked) = تحسين لاحق — الآن رفع متدفّق أحاديّ اللقطة.

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface StreamedUpload {
  assetKey: string;
  type: MediaKind;
  bytes: number;
}

function mb(n: number): number {
  return Math.floor(n / (1024 * 1024));
}

export async function streamUploadToPrivate(
  body: ReadableStream<Uint8Array> | null,
): Promise<StreamedUpload> {
  if (!body) throw new UploadError("لا محتوى.", 400);
  await ensurePrivateDir();

  const tmpKey = makePrivateKey("upload.tmp");
  const tmpPath = privatePath(tmpKey);
  const ws = createWriteStream(tmpPath);

  let header = Buffer.alloc(0);
  let bytes = 0;
  let kind: MediaKind | null = null;
  let ext = "";
  // حدّ أوّليّ = الأكبر (فيديو)، يُضيَّق فور معرفة النوع.
  let max = Math.max(maxUgcBytes("VIDEO"), maxUgcBytes("IMAGE"));

  const cleanup = async () => {
    ws.destroy();
    await deletePrivateFile(tmpKey);
  };

  try {
    const nodeStream = Readable.fromWeb(body as import("node:stream/web").ReadableStream<Uint8Array>);
    for await (const chunk of nodeStream) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (header.length < 16) {
        header = Buffer.concat([header, buf.subarray(0, 16 - header.length)]);
        if (header.length >= 12 && kind === null) {
          const s = sniffMedia(header);
          if (s) {
            kind = s.kind;
            ext = s.ext;
            max = maxUgcBytes(kind);
          }
        }
      }
      bytes += buf.length;
      if (bytes > max) {
        await cleanup();
        throw new UploadError(`الملف كبير جداً (الحدّ ${mb(max)}MB).`, 413);
      }
      if (!ws.write(buf)) await once(ws, "drain");
    }
    ws.end();
    await once(ws, "finish");
  } catch (e) {
    if (e instanceof UploadError) throw e;
    await cleanup();
    throw new UploadError("تعذّر استقبال الملف.", 400);
  }

  if (bytes === 0) {
    await deletePrivateFile(tmpKey);
    throw new UploadError("ملف فارغ.", 400);
  }
  if (!kind) {
    await deletePrivateFile(tmpKey);
    throw new UploadError("نوع ملف غير مدعوم (فيديو mp4/mov/webm أو صورة).", 415);
  }

  const assetKey = makePrivateKey(`ugc.${ext}`);
  await renamePrivate(tmpKey, assetKey);
  return { assetKey, type: kind, bytes };
}
