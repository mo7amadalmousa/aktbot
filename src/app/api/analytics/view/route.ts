import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asRecord, str } from "@/lib/public/block-config";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  VISITOR_COOKIE,
  newVisitorId,
  visitorCookieOptions,
} from "@/lib/story/visitor";
import { classifyReferrer, todayUTC, type Source } from "@/lib/analytics/track";

export const runtime = "nodejs";

// تتبّع زيارة صفحة عامّة — مجمّع يوميّاً (لا صفّ لكل زيارة). لا يكسر cache الصفحة:
// الصفحة تبقى ثابتة وهذا beacon منفصل. لا PII. فريد يوميّ عبر aktbot_vid.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  // مضادّ تضخيم عامّ لكل IP (لا يعيق الاستخدام الطبيعيّ).
  if (!rateLimit(`av:${ip}`, 120, 60_000)) {
    return NextResponse.json({ ok: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const b = asRecord(body);
  const username = str(b.username).toLowerCase();
  if (!username) return NextResponse.json({ ok: true });

  // صفحة منشورة فقط (لا نعدّ زيارات لغير المنشور).
  const profile = await prisma.creatorProfile.findUnique({
    where: { username },
    select: { id: true, isPublished: true },
  });
  if (!profile || !profile.isPublished) {
    return NextResponse.json({ ok: true });
  }

  // مضادّ تضخيم لكل (IP + مبدع): حتّى 30 زيارة/10د تُعدّ.
  if (!rateLimit(`av:${ip}:${profile.id}`, 30, 10 * 60_000)) {
    return NextResponse.json({ ok: true });
  }

  const date = todayUTC();
  const selfHost = req.headers.get("host");
  const source: Source = classifyReferrer(str(b.ref) || req.headers.get("referer"), selfHost);

  // فريد يوميّ: أنشئ صفّ VisitorDay؛ نجاحه = زائر جديد اليوم.
  let vid = req.cookies.get(VISITOR_COOKIE)?.value;
  const isNewCookie = !vid;
  if (!vid) vid = newVisitorId();

  let isUnique = false;
  try {
    await prisma.visitorDay.create({
      data: { creatorProfileId: profile.id, visitorId: vid, date },
    });
    isUnique = true;
  } catch {
    isUnique = false; // موجود اليوم (P2002) → ليس فريداً جديداً
  }

  const srcInc =
    source === "direct"
      ? { srcDirect: { increment: 1 } }
      : source === "social"
        ? { srcSocial: { increment: 1 } }
        : { srcOther: { increment: 1 } };

  await prisma.pageViewDaily
    .upsert({
      where: { creatorProfileId_date: { creatorProfileId: profile.id, date } },
      update: {
        views: { increment: 1 },
        ...(isUnique ? { uniques: { increment: 1 } } : {}),
        ...srcInc,
      },
      create: {
        creatorProfileId: profile.id,
        date,
        views: 1,
        uniques: isUnique ? 1 : 0,
        srcDirect: source === "direct" ? 1 : 0,
        srcSocial: source === "social" ? 1 : 0,
        srcOther: source === "other" ? 1 : 0,
      },
    })
    .catch(() => {});

  const res = NextResponse.json({ ok: true });
  if (isNewCookie) res.cookies.set(VISITOR_COOKIE, vid, visitorCookieOptions());
  return res;
}
