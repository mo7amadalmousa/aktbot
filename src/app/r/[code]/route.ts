import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { classifyReferrer } from "@/lib/analytics/track";
import { VISITOR_COOKIE } from "@/lib/story/visitor";
import {
  recordClick,
  ATTR_COOKIE,
  attrCookieOptions,
} from "@/lib/attribution/engine";

export const runtime = "nodejs";

// رابط الإسناد الفريد: يسجّل CLICK + يضع كوكي إسناد + يوجّه لصفحة المبدع.
// حملة غير نشطة → توجيه دون تتبّع/إسناد. كود مجهول → توجيه للرئيسيّة.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const ip = clientIp(req);
  const home = new URL("/", req.url);

  if (!code) return NextResponse.redirect(home, { status: 302 });

  // مضادّ تضخيم: نعدّ النقرة فقط ضمن الحدّ (لكن نوجّه دائماً).
  const countable =
    rateLimit(`rc:${ip}`, 120, 60_000) &&
    rateLimit(`rc:${ip}:${code}`, 10, 10 * 60_000);

  const visitorRef = req.cookies.get(VISITOR_COOKIE)?.value ?? null;
  const source = classifyReferrer(req.headers.get("referer"), req.headers.get("host"));

  const result = await recordClick(code.toUpperCase(), visitorRef, source, countable);

  if (!result) return NextResponse.redirect(home, { status: 302 });

  const dest = new URL(`/u/${result.destinationUsername}`, req.url);
  const res = NextResponse.redirect(dest, { status: 302 });
  // كوكي الإسناد يُضبط فقط للحملات النشطة (إسناد فعّال).
  if (result.active) {
    res.cookies.set(ATTR_COOKIE, result.participationId, attrCookieOptions());
  }
  return res;
}
