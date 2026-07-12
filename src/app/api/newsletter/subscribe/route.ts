import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asRecord, str } from "@/lib/public/block-config";
import { normalizeEmail, isValidEmail, normalizeUsername } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// اشتراك النشرة (عامّ، بلا مصادقة). استجابة موحّدة دائماً — لا تكشف إن كان مشتركاً.
export async function POST(req: NextRequest) {
  // حدّ معدّل أساسيّ لكل IP.
  if (!rateLimit(`nl:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ ok: true }); // استجابة موحّدة حتى عند التقييد
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const b = asRecord(body);
  const honeypot = str(b.website); // فخّ البوتات (حقل مخفيّ)
  const email = normalizeEmail(str(b.email));
  const username = normalizeUsername(str(b.username));

  // بوت (ملأ الفخّ) أو بريد غير صالح → استجابة نجاح موحّدة دون فعل.
  if (honeypot || !isValidEmail(email) || !username) {
    return NextResponse.json({ ok: true });
  }

  const profile = await prisma.creatorProfile.findUnique({
    where: { username },
    select: { id: true, isPublished: true },
  });

  if (profile && profile.isPublished) {
    // upsert idempotent — لا يكشف إن كان مشتركاً مسبقاً.
    await prisma.newsletterSubscriber
      .upsert({
        where: {
          creatorProfileId_email: { creatorProfileId: profile.id, email },
        },
        update: {},
        create: { creatorProfileId: profile.id, email },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
