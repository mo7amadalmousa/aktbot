import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asRecord, str } from "@/lib/public/block-config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// تتبّع نقر بلوك — مجمّع (صفّ لكل بلوك، نفس فلسفة CouponCounter). beacon خفيف.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`ac:${ip}`, 120, 60_000)) {
    return NextResponse.json({ ok: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const blockId = str(asRecord(body).blockId);
  if (!blockId) return NextResponse.json({ ok: true });

  // بلوك منشور وظاهر فقط.
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    select: {
      visibility: true,
      page: {
        select: {
          creatorProfile: { select: { id: true, isPublished: true } },
        },
      },
    },
  });
  const creatorProfileId = block?.page?.creatorProfile?.id;
  if (!block || !block.visibility || !block.page?.creatorProfile?.isPublished || !creatorProfileId) {
    return NextResponse.json({ ok: true });
  }

  // مضادّ تضخيم لكل (IP + بلوك): حتّى 10 نقرات/10د تُعدّ.
  if (rateLimit(`ac:${ip}:${blockId}`, 10, 10 * 60_000)) {
    await prisma.blockClick
      .upsert({
        where: { blockId },
        update: { count: { increment: 1 } },
        create: { blockId, creatorProfileId, count: 1 },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
