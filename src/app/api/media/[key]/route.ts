import { NextRequest, NextResponse } from "next/server";
import { readFromDisk, isValidKey } from "@/lib/storage/disk";
import { baseKeyOf } from "@/lib/storage/asset";

export const runtime = "nodejs";

// يخدم الصور المخزّنة محلياً (LocalStorageAdapter). في الإنتاج (vps) تُخدَم عبر Nginx.
// متغيّر مفقود (uuid@640.webp) → fallback للأساس (uuid.webp) — يدعم الصور القديمة.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!isValidKey(key)) {
    return new NextResponse("Not found", { status: 404 });
  }
  let data = await readFromDisk(key);
  if (!data) {
    const base = baseKeyOf(key);
    if (base !== key) data = await readFromDisk(base);
  }
  if (!data) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
