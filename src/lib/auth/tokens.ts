import { randomBytes, createHash } from "node:crypto";

// توكن عشوائيّ عالي الإنتروبيا — يُرسَل خاماً في الرابط، ويُخزَّن مجزّأً (sha256) في القاعدة.
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function expiresInMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// صلاحيات قصيرة (استخدام مرّة واحدة يُطبَّق بالحذف بعد الاستهلاك).
export const EMAIL_VERIFICATION_TTL_MIN = 60; // ساعة واحدة
export const PASSWORD_RESET_TTL_MIN = 30; // نصف ساعة
