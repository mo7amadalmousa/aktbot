import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth-edge";

// ── توجيه النطاقات ────────────────────────────────────────────────────
// aktbot.com      → تسويقي (لاحقاً)
// app.aktbot.com  → لوحات التحكّم (مصادقة) — هذه المنطقة
// aktbot.link/... → صفحة عامّة (لاحقاً) — بلا أي منطق جلسات
//
// المناطق تُحدَّد بمتغيّرات بيئة (APP_HOST/LINK_HOST/MARKETING_HOST) كي يعمل
// نفس الكود محلياً (localhost:3009) وعلى الإنتاج دون تغيير. محلياً/افتراضياً
// نعتبر المضيف منطقة app (حيث المصادقة واللوحات).

type Zone = "app" | "link" | "marketing";

function zoneForHost(host: string): Zone {
  const h = host.split(":")[0].toLowerCase();
  const linkHost = process.env.LINK_HOST?.toLowerCase();
  const marketingHost = process.env.MARKETING_HOST?.toLowerCase();
  const appHost = process.env.APP_HOST?.toLowerCase();

  if (linkHost && h === linkHost) return "link";
  if (marketingHost && h === marketingHost) return "marketing";
  if (appHost && h === appHost) return "app";
  // محلياً / غير مضبوط → منطقة app.
  return "app";
}

// مسارات منطقة app التي تتطلّب جلسة صالحة.
const APP_PROTECTED_PREFIXES = ["/dashboard", "/admin"];

function needsAuth(pathname: string): boolean {
  return APP_PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

// مسارات لوحة الإشراف — دور ADMIN حصراً.
function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const zone = zoneForHost(host);
  const { pathname } = req.nextUrl;

  // منطقة الرابط العامّة: لا منطق جلسات إطلاقاً.
  // aktbot.link/<username> → إعادة كتابة داخليّة إلى /u/<username>.
  if (zone === "link") {
    const seg = pathname.split("/").filter(Boolean);
    if (
      seg.length === 1 &&
      !pathname.startsWith("/u/") &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/_next/")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = `/u/${seg[0]}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // منطقة app: احمِ المسارات الخاصّة.
  if (zone === "app" && needsAuth(pathname)) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySession(token);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    // لوحة الإشراف: دور ADMIN فقط — غيرهم يُحوَّل للداشبورد.
    if (isAdminPath(pathname) && session.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // طبّق على كل المسارات عدا الأصول الثابتة و_next.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
