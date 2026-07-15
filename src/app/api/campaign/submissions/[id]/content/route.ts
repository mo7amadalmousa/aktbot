import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { privatePath, privateFileSize } from "@/lib/storage/private-files";
import { streamContentType } from "@/lib/campaign/media";
import { anyLiveUsageRight } from "@/lib/campaign/ugc";

export const runtime = "nodejs";

// بثّ محتوى UGC من التخزين الخاصّ — لا مفتاح/مسار مكشوف، لا رابط عام.
// معاينة (inline · Range 206 للفيديو) لـ: أدمن · العلامة صاحبة الحملة · المبدع.
// تنزيل (?download=1) للعلامة/الأدمن مشروط بحقّ استخدام حيّ (ACTIVE/EXPIRING_SOON).
function deny(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function webStreamFrom(path: string, start?: number, end?: number): ReadableStream<Uint8Array> {
  const node = createReadStream(path, start !== undefined ? { start, end } : {});
  return Readable.toWeb(node) as unknown as ReadableStream<Uint8Array>;
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
      status: true,
      creatorProfile: { select: { userId: true } },
      campaign: { select: { brand: { select: { userId: true } } } },
      usageRights: { select: { status: true, endAt: true } },
    },
  });
  if (!sub) return deny(404, "غير موجود.");

  const isAdmin = session.role === "ADMIN";
  const isCreator = session.sub === sub.creatorProfile.userId;
  const isBrand = session.sub === sub.campaign.brand.userId;
  if (!isAdmin && !isCreator && !isBrand) return deny(403, "غير مصرّح.");

  // المحتوى المرفوض محجوب — لا يُعرَض/يُنزَّل للعلامة إطلاقاً (حماية من الاستغلال).
  if (sub.status === "REJECTED" && !isCreator && !isAdmin) return deny(403, "محتوى محجوب.");

  const wantsDownload = req.nextUrl.searchParams.get("download") === "1";
  if (wantsDownload && !isCreator) {
    if (!anyLiveUsageRight(sub.usageRights)) {
      return deny(403, "التنزيل يتطلّب حقوق استخدام سارية.");
    }
  }

  const size = await privateFileSize(sub.assetKey);
  if (size === null) return deny(404, "الملف غير متاح.");
  const path = privatePath(sub.assetKey);
  const { type, inline } = streamContentType(sub.assetKey);

  // تنزيل: ملف كامل (attachment).
  if (wantsDownload || !inline) {
    return new NextResponse(webStreamFrom(path), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(size),
        "Content-Disposition": `attachment; filename="content"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Accept-Ranges": "bytes",
      },
    });
  }

  // معاينة inline مع دعم Range (تمرير/بحث في الفيديو دون تحميل كامل).
  const range = req.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m) {
      let start = m[1] ? parseInt(m[1], 10) : 0;
      let end = m[2] ? parseInt(m[2], 10) : size - 1;
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end) || end >= size) end = size - 1;
      if (start > end || start >= size) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
        });
      }
      return new NextResponse(webStreamFrom(path, start, end), {
        status: 206,
        headers: {
          "Content-Type": type,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  }

  return new NextResponse(webStreamFrom(path), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      "Content-Disposition": `inline; filename="content"`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
