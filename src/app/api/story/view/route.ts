import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asRecord } from "@/lib/public/block-config";
import {
  VISITOR_COOKIE,
  newVisitorId,
  visitorCookieOptions,
} from "@/lib/story/visitor";

export const runtime = "nodejs";

// تسجيل مشاهدة ستوري لزائر مجهول (بلا مصادقة). idempotent عبر unique(blockId,visitorId).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const blockId = String(asRecord(body).blockId ?? "");
  if (!blockId) return NextResponse.json({ ok: false }, { status: 400 });

  // تأكّد أنّ البلوك ستوري منشور وظاهر (لا نسجّل لغير الستوريات العامّة).
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    select: {
      type: true,
      visibility: true,
      page: { select: { creatorProfile: { select: { isPublished: true } } } },
    },
  });
  if (
    !block ||
    block.type !== "STORY" ||
    !block.visibility ||
    !block.page?.creatorProfile?.isPublished
  ) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  let vid = req.cookies.get(VISITOR_COOKIE)?.value;
  const isNew = !vid;
  if (!vid) vid = newVisitorId();

  await prisma.storyView.upsert({
    where: { blockId_visitorId: { blockId, visitorId: vid } },
    update: {},
    create: { blockId, visitorId: vid },
  });

  const res = NextResponse.json({ ok: true });
  if (isNew) res.cookies.set(VISITOR_COOKIE, vid, visitorCookieOptions());
  return res;
}
