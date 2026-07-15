import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { readPrivateFile } from "@/lib/storage/private-files";
import { streamContentType } from "@/lib/campaign/media";
import { hasLiveUsageRight } from "@/lib/campaign/ugc";

export const runtime = "nodejs";

// بثّ محتوى UGC من التخزين الخاصّ — لا يُكشَف المفتاح/المسار، ولا رابط عام.
// معاينة (inline) مسموحة لـ: الأدمن · العلامة صاحبة الحملة · المبدع صاحب المحتوى.
// التنزيل (?download=1) للعلامة/الأدمن مشروط بحقّ استخدام مقبول سارٍ (وإلا 403).
function deny(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return deny(401, "غير مصادق.");
  const { id } = await params;

  const sub = await prisma.contentSubmission.findUnique({
    where: { id },
    select: {
      assetKey: true,
      creatorProfile: { select: { userId: true } },
      campaign: { select: { brand: { select: { userId: true } } } },
      usageRight: { select: { status: true, endAt: true } },
    },
  });
  if (!sub) return deny(404, "غير موجود.");

  const isAdmin = session.role === "ADMIN";
  const isCreator = session.sub === sub.creatorProfile.userId;
  const isBrand = session.sub === sub.campaign.brand.userId;
  if (!isAdmin && !isCreator && !isBrand) return deny(403, "غير مصرّح.");

  const wantsDownload = req.nextUrl.searchParams.get("download") === "1";
  if (wantsDownload && !isCreator) {
    // التنزيل الإعلانيّ للعلامة/الأدمن شرطه حقّ استخدام مقبول سارٍ.
    if (!hasLiveUsageRight(sub.usageRight)) {
      return deny(403, "التنزيل يتطلّب حقوق استخدام مقبولة سارية.");
    }
  }

  const buffer = await readPrivateFile(sub.assetKey);
  if (!buffer) return deny(404, "الملف غير متاح.");

  const { type, inline } = streamContentType(sub.assetKey);
  const useInline = inline && !wantsDownload;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": `${useInline ? "inline" : "attachment"}; filename="content"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
