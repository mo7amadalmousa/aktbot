import { SignJWT, jwtVerify } from "jose";

// ── جلسة JWT (edge-safe عبر jose) ────────────────────────────────────
// يُستخدم هذا الملف في proxy.ts (edge) وفي الخادم — لا يستورد Prisma إطلاقاً.

export const SESSION_COOKIE = "aktbot_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 أيام

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET غير مضبوط (يجب أن يكون سرّاً عشوائياً طويلاً).");
  }
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  sub: string; // معرّف المستخدم
  email: string;
  role: string;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ""),
      role: String(payload.role ?? ""),
    };
  } catch {
    return null;
  }
}
