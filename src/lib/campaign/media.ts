// ── أمان وسائط UGC: فحص magic bytes + حدود الحجم + نوع المحتوى للبثّ ────
// الملف يبقى خاصّاً دائماً (لا رابط عام). نتحقّق أنّ محتوى الملف الفعليّ يطابق
// النوع المعلَن (VIDEO|IMAGE) عبر التواقيع الثنائيّة — لا نثق بالامتداد وحده.

export type MediaKind = "VIDEO" | "IMAGE";

// حدود الحجم — الفيديو يحتاج حدّاً أعلى. قابلة للضبط عبر البيئة.
export function maxUgcBytes(kind: MediaKind): number {
  if (kind === "VIDEO") {
    const n = Number(process.env.UGC_VIDEO_MAX_BYTES);
    return Number.isFinite(n) && n > 0 ? n : 200 * 1024 * 1024; // 200MB
  }
  const n = Number(process.env.UGC_IMAGE_MAX_BYTES);
  return Number.isFinite(n) && n > 0 ? n : 15 * 1024 * 1024; // 15MB
}

function bytesEq(buf: Buffer, offset: number, sig: number[]): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[offset + i] !== sig[i]) return false;
  return true;
}
function ascii(buf: Buffer, offset: number, text: string): boolean {
  return bytesEq(buf, offset, [...text].map((ch) => ch.charCodeAt(0)));
}

// يستنبط النوع + الامتداد القانونيّ من التوقيع الثنائيّ (أو null إن غير مدعوم).
// نعتمد المحتوى الفعليّ لا الامتداد المعلَن (أمان الرفع).
export function sniffMedia(buf: Buffer): { kind: MediaKind; ext: string } | null {
  // صور
  if (bytesEq(buf, 0, [0xff, 0xd8, 0xff])) return { kind: "IMAGE", ext: "jpg" }; // JPEG
  if (bytesEq(buf, 0, [0x89, 0x50, 0x4e, 0x47])) return { kind: "IMAGE", ext: "png" }; // PNG
  if (ascii(buf, 0, "GIF8")) return { kind: "IMAGE", ext: "gif" }; // GIF
  if (ascii(buf, 0, "RIFF") && ascii(buf, 8, "WEBP")) return { kind: "IMAGE", ext: "webp" }; // WEBP
  // فيديو (ISO-BMFF: MP4/MOV/M4V — التمييز عبر العلامة التجاريّة)
  if (ascii(buf, 4, "ftyp")) {
    const brand = buf.slice(8, 12).toString("latin1");
    if (brand.startsWith("qt")) return { kind: "VIDEO", ext: "mov" };
    return { kind: "VIDEO", ext: "mp4" };
  }
  if (bytesEq(buf, 0, [0x1a, 0x45, 0xdf, 0xa3])) return { kind: "VIDEO", ext: "webm" }; // WebM
  return null;
}

// نوع المحتوى للبثّ المحميّ حسب امتداد المفتاح المخزَّن (inline للمعاينة).
export function streamContentType(key: string): { type: string; inline: boolean } {
  const ext = key.match(/\.([A-Za-z0-9]+)$/)?.[1]?.toLowerCase() ?? "";
  switch (ext) {
    case "mp4":
      return { type: "video/mp4", inline: true };
    case "webm":
      return { type: "video/webm", inline: true };
    case "mov":
      return { type: "video/quicktime", inline: true };
    case "m4v":
      return { type: "video/x-m4v", inline: true };
    case "jpg":
    case "jpeg":
      return { type: "image/jpeg", inline: true };
    case "png":
      return { type: "image/png", inline: true };
    case "webp":
      return { type: "image/webp", inline: true };
    case "gif":
      return { type: "image/gif", inline: true };
    default:
      return { type: "application/octet-stream", inline: false };
  }
}
