import bcrypt from "bcryptjs";

// تجزئة كلمة المرور مخفيّة خلف هذه الواجهة — قابلة للتبديل (argon2 لاحقاً) دون مساس المستدعي.
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
