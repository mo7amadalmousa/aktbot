import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  verifySession,
  type SessionPayload,
} from "@/lib/auth-edge";

// خيارات الكوكي: host-only (بلا Domain) → مقيّد بمضيف app فقط، لا يُشارَك عبر النطاقات.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export function clearedSessionCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: 0 };
}

// قراءة الجلسة من الكوكي في مكوّنات/إجراءات الخادم.
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}
