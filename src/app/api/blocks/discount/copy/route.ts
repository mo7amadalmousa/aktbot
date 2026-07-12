import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asRecord, str, arr } from "@/lib/public/block-config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// زيادة عدّاد نسخ كوبون — API خفيف منفصل (الصفحة العامّة تبقى قابلة للـcache).
// النسخ نفسه يحدث عميلاً؛ هذا يعدّ فقط. مضاد تضخيم بلا إعاقة الاستخدام الطبيعيّ.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  // حدّ عامّ لكل IP (مضادّ سبام).
  if (!rateLimit(`cp:${ip}`, 60, 60_000)) {
    return NextResponse.json({ ok: true }); // موحّد
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const b = asRecord(body);
  const blockId = str(b.blockId);
  const couponId = str(b.couponId);
  if (!blockId || !couponId) return NextResponse.json({ ok: true });

  // تحقّق: بلوك خصومات منشور وظاهر، والكوبون ضمنه.
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    select: {
      type: true,
      visibility: true,
      config: true,
      page: { select: { creatorProfile: { select: { isPublished: true } } } },
    },
  });
  if (
    !block ||
    block.type !== "DISCOUNT" ||
    !block.visibility ||
    !block.page?.creatorProfile?.isPublished
  ) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const couponIds = arr(asRecord(block.config).coupons).map((cp) => str(asRecord(cp).id));
  if (!couponIds.includes(couponId)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // مضادّ تضخيم لكل (IP + كوبون): نعدّ حتى 3 مرّات كل 10 دقائق؛ الزائد يُنسخ لكن لا يُعدّ.
  if (rateLimit(`cp:${ip}:${blockId}:${couponId}`, 3, 10 * 60_000)) {
    await prisma.couponCounter
      .upsert({
        where: { blockId_couponId: { blockId, couponId } },
        update: { count: { increment: 1 } },
        create: { blockId, couponId, count: 1 },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
