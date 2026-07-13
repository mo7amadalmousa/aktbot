import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { readPrivateFile } from "@/lib/storage/private-files";

export const runtime = "nodejs";

// بثّ ملف/فيديو درس الكورس — محميّ بتوكن Enrollment. لا يُكشَف المفتاح/المسار،
// ويُتحقّق أنّ الدرس يخصّ الكورس الذي اشتراه صاحب التوكن.

function deny(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// نوع المحتوى من الامتداد — الفيديو inline (ليُشغَّل)، غيره تنزيل آمن.
function contentInfo(name: string | null): { type: string; inline: boolean } {
  const ext = (name || "").match(/\.([A-Za-z0-9]+)$/)?.[1]?.toLowerCase();
  if (ext === "mp4") return { type: "video/mp4", inline: true };
  if (ext === "webm") return { type: "video/webm", inline: true };
  if (ext === "mov") return { type: "video/quicktime", inline: true };
  if (ext === "m4v") return { type: "video/x-m4v", inline: true };
  return { type: "application/octet-stream", inline: false };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; lessonId: string }> },
) {
  const { token, lessonId } = await params;
  if (!token || token.length < 32) return deny(404, "رابط غير صالح.");

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { productId: true, order: { select: { status: true } } },
  });
  if (!enrollment) return deny(404, "رابط غير صالح.");
  if (enrollment.order.status !== "PAID") return deny(403, "الوصول غير مؤكّد.");

  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    select: {
      assetKey: true,
      assetName: true,
      module: { select: { productId: true } },
    },
  });
  // الدرس يجب أن يخصّ نفس الكورس المشترى.
  if (!lesson || lesson.module.productId !== enrollment.productId) {
    return deny(404, "غير موجود.");
  }
  if (!lesson.assetKey) return deny(404, "لا ملف لهذا الدرس.");

  const buffer = await readPrivateFile(lesson.assetKey);
  if (!buffer) return deny(404, "الملف غير متاح.");

  const { type, inline } = contentInfo(lesson.assetName);
  const encoded = encodeURIComponent(lesson.assetName || "lesson");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="lesson"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
