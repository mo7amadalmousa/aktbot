import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { processImage, ImageError, type UploadVariant } from "@/lib/storage/image";
import { getStorageProvider, keyFromManagedUrl } from "@/lib/storage";
import { checkUploadRate } from "@/lib/storage/rate-limit";

export const runtime = "nodejs";

const VARIANTS: UploadVariant[] = ["avatar", "background", "gallery"];

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
  const variantRaw = String(form.get("variant") ?? "gallery");
  const variant: UploadVariant = VARIANTS.includes(variantRaw as UploadVariant)
    ? (variantRaw as UploadVariant)
    : "gallery";
  const previousUrl = String(form.get("previousUrl") ?? "");

  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ ok: false, error: "لا ملف." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let processed;
  try {
    processed = await processImage(buffer, variant);
  } catch (e) {
    const msg = e instanceof ImageError ? e.message : "تعذّرت معالجة الصورة.";
    return NextResponse.json({ ok: false, error: msg }, { status: 422 });
  }

  const storage = getStorageProvider();
  const result = await storage.put({
    key: processed.key,
    data: processed.data,
    contentType: processed.contentType,
  });

  await prisma.mediaAsset.create({
    data: { key: processed.key, userId: session.sub },
  });

  // حذف الصورة القديمة عند الاستبدال (إن كانت مُدارة ومملوكة) — لا يتيمة.
  const oldKey = previousUrl ? keyFromManagedUrl(previousUrl) : null;
  if (oldKey && oldKey !== processed.key) {
    const owned = await prisma.mediaAsset.findUnique({ where: { key: oldKey } });
    if (owned && owned.userId === session.sub) {
      await storage.delete(oldKey);
      await prisma.mediaAsset.delete({ where: { key: oldKey } }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, url: result.url, key: result.key });
}
