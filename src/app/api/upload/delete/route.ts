import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getStorageProvider, keyFromManagedUrl } from "@/lib/storage";

export const runtime = "nodejs";

// حذف صورة مُدارة — بتحقّق ملكيّة (المالك فقط).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const url = typeof (body as { url?: unknown }).url === "string"
    ? (body as { url: string }).url
    : "";
  const key = keyFromManagedUrl(url);
  if (!key) {
    return NextResponse.json({ ok: true }); // ليس رابطاً مُداراً — لا شيء لحذفه
  }

  const asset = await prisma.mediaAsset.findUnique({ where: { key } });
  if (!asset) return NextResponse.json({ ok: true });
  if (asset.userId !== session.sub) {
    return NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 });
  }

  await getStorageProvider().delete(key);
  await prisma.mediaAsset.delete({ where: { key } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
