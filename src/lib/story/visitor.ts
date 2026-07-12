import { randomUUID } from "node:crypto";

// معرّف زائر مجهول (opaque) — كوكي host-only httpOnly، غير مرتبط بأيّ هوية.
// يُستخدم فقط لتتبّع مشاهدة ستوري VIEW_ONCE (خصوصيّة).
export const VISITOR_COOKIE = "aktbot_vid";
const YEAR_SEC = 60 * 60 * 24 * 365;

export function newVisitorId(): string {
  return randomUUID();
}

export function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR_SEC,
  };
}
