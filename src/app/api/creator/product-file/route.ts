import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { checkUploadRate } from "@/lib/storage/rate-limit";
import {
  writePrivateFile,
  makePrivateKey,
  maxProductBytes,
} from "@/lib/storage/private-files";

export const runtime = "nodejs";

// رفع ملف المنتج الرقميّ إلى التخزين الخاصّ (UPLOAD_DIR/private).
// لا يُخدَم عبر /api/media إطلاقاً؛ يُسلَّم فقط بعد دفع مؤكّد عبر /api/download.
// يعيد { fileKey, fileName, size } ليُربَط بـProductAsset عند حفظ المنتج.

// اسم عرض آمن: يُجرَّد من المسارات، يُقصَّر. (المفتاح الفعليّ عشوائيّ لا اسمه.)
function safeDisplayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return base.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "ملف";
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  if (!checkUploadRate(session.sub)) {
    return NextResponse.json(
      { ok: false, error: "محاولات كثيرة، انتظر قليلاً." },
      { status: 429 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ ok: false, error: "لا ملف." }, { status: 400 });
  }

  const max = maxProductBytes();
  if (file.size > max) {
    const mb = Math.floor(max / (1024 * 1024));
    return NextResponse.json(
      { ok: false, error: `الملف كبير جداً (الحدّ ${mb}MB).` },
      { status: 413 },
    );
  }

  const fileName = safeDisplayName(file.name || "ملف");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength === 0) {
    return NextResponse.json({ ok: false, error: "ملف فارغ." }, { status: 400 });
  }

  const fileKey = makePrivateKey(fileName);
  await writePrivateFile(fileKey, buffer);

  return NextResponse.json({
    ok: true,
    fileKey,
    fileName,
    size: buffer.byteLength,
  });
}
