import { NextRequest, NextResponse } from "next/server";
import { readFromDisk, isValidKey } from "@/lib/storage/disk";

export const runtime = "nodejs";

// يخدم الصور المخزّنة محلياً (LocalStorageAdapter). في الإنتاج (vps) تُخدَم عبر Nginx.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!isValidKey(key)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const data = await readFromDisk(key);
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
