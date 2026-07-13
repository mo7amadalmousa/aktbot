import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { readPrivateFile } from "@/lib/storage/private-files";

export const runtime = "nodejs";

// ── تحميل آمن للمنتج الرقميّ ──────────────────────────────────────────
// يُتحقَّق: التوكن (مجزّأ) موجود · الطلب مدفوع · لم تنتهِ الصلاحية · لم يُستنفد
// حدّ التحميل. يُبَثّ الملف من التخزين الخاصّ دون كشف مساره أو مفتاحه.
// الرابط غير قابل للتخمين (256-bit) ولا يُخزَّن خاماً (sha256 فقط).

function deny(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 32) return deny(404, "رابط غير صالح.");

  const tokenHash = hashToken(token);
  const dl = await prisma.downloadToken.findUnique({
    where: { tokenHash },
    include: {
      order: { select: { status: true } },
      productAsset: { select: { fileKey: true, fileName: true } },
    },
  });

  if (!dl) return deny(404, "رابط غير صالح.");
  if (dl.order.status !== "PAID") return deny(403, "لم يُؤكَّد الدفع بعد.");
  if (dl.expiresAt.getTime() < Date.now()) return deny(410, "انتهت صلاحية الرابط.");
  if (dl.downloadCount >= dl.maxDownloads) {
    return deny(429, "استُنفد حدّ مرّات التحميل.");
  }

  const buffer = await readPrivateFile(dl.productAsset.fileKey);
  if (!buffer) return deny(404, "الملف غير متاح.");

  // زيادة العدّاد ذرّيّاً بشرط عدم تجاوز الحدّ (تفادي السباق).
  const bumped = await prisma.downloadToken.updateMany({
    where: { id: dl.id, downloadCount: { lt: dl.maxDownloads } },
    data: { downloadCount: { increment: 1 } },
  });
  if (bumped.count === 0) return deny(429, "استُنفد حدّ مرّات التحميل.");

  // تحميل قسريّ (attachment) — لا عرض inline، فلا تنفيذ محتوى في المتصفّح.
  const encoded = encodeURIComponent(dl.productAsset.fileName);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": `attachment; filename="download"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
