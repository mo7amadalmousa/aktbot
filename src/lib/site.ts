// روابط عبر المناطق (marketing/app/link). CTAs في اللاندينغ تشير لمنطقة app.

function trimSlash(u: string): string {
  return u.replace(/\/$/, "");
}

// عنوان تطبيق app (app.aktbot.com إنتاجاً · localhost:3009 محلياً).
export function appUrl(path = "/"): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL &&
    process.env.NEXT_PUBLIC_APP_URL.trim() !== ""
      ? trimSlash(process.env.NEXT_PUBLIC_APP_URL)
      : "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export const SIGNUP_URL = appUrl("/signup");
export const LOGIN_URL = appUrl("/login");
