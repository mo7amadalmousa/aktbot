// ── تحقّق مشترك: البريد + اسم المستخدم (slug) + كلمة المرور ───────────

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeUsername(u: string): string {
  return u.trim().toLowerCase();
}

// 3–30 حرفاً · أحرف إنجليزية صغيرة/أرقام/نقطة/شرطة/شرطة سفلية · تبدأ وتنتهي بحرف أو رقم.
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;

// أسماء محجوزة (مسارات النظام والنطاقات الفرعية).
const RESERVED_USERNAMES = new Set([
  "admin",
  "app",
  "api",
  "www",
  "aktbot",
  "login",
  "signup",
  "logout",
  "dashboard",
  "verify-email",
  "forgot-password",
  "reset-password",
  "settings",
  "about",
  "help",
  "support",
  "terms",
  "privacy",
  "pricing",
  "blog",
]);

export type UsernameCheck = { ok: true } | { ok: false; error: string };

export function validateUsername(input: string): UsernameCheck {
  const u = normalizeUsername(input);
  if (u.length < 3 || u.length > 30) {
    return { ok: false, error: "اسم المستخدم يجب أن يكون بين 3 و30 حرفاً." };
  }
  if (!USERNAME_RE.test(u)) {
    return {
      ok: false,
      error:
        "أحرف إنجليزية صغيرة وأرقام ونقطة وشرطة وشرطة سفلية، ويبدأ/ينتهي بحرف أو رقم.",
    };
  }
  if (RESERVED_USERNAMES.has(u)) {
    return { ok: false, error: "اسم المستخدم محجوز، اختر غيره." };
  }
  return { ok: true };
}

export const MIN_PASSWORD_LENGTH = 8;

export function isStrongEnoughPassword(pw: string): boolean {
  return typeof pw === "string" && pw.length >= MIN_PASSWORD_LENGTH;
}
