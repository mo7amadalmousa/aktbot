import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { processImageSet, ImageError, type UploadVariant } from "@/lib/storage/image";
import { getStorageProvider, keyFromManagedUrl } from "@/lib/storage";
import { allVariantKeys } from "@/lib/storage/asset";
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
    processed = await processImageSet(buffer, variant);
  } catch (e) {
    const msg = e instanceof ImageError ? e.message : "تعذّرت معالجة الصورة.";
    return NextResponse.json({ ok: false, error: msg }, { status: 422 });
  }

  const storage = getStorageProvider();
  // خزّن كل الأحجام (الأساس + المتغيّرات).
  let baseResult = null;
  for (const out of processed.outputs) {
    const r = await storage.put({
      key: out.key,
      data: out.data,
      contentType: processed.contentType,
    });
    if (out.key === processed.baseKey) baseResult = r;
  }

  await prisma.mediaAsset.create({
    data: { key: processed.baseKey, userId: session.sub },
  });

  // حذف الصورة القديمة (وكل متغيّراتها) عند الاستبدال — لا يتيمة.
  const oldKey = previousUrl ? keyFromManagedUrl(previousUrl) : null;
  if (oldKey && oldKey !== processed.baseKey) {
    const owned = await prisma.mediaAsset.findUnique({ where: { key: oldKey } });
    if (owned && owned.userId === session.sub) {
      for (const k of allVariantKeys(oldKey)) await storage.delete(k);
      await prisma.mediaAsset.delete({ where: { key: oldKey } }).catch(() => {});
    }
  }

  return NextResponse.json({
    ok: true,
    url: baseResult?.url ?? storage.getUrl(processed.baseKey),
    key: processed.baseKey,
    widths: processed.generatedWidths,
  });
}
