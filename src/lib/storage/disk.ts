import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// مجلد التخزين — خارج repo/git دائماً. قابل للإعداد عبر UPLOAD_DIR.
// افتراضيّاً مجلد شقيق للمشروع (C:\dev\aktbot-uploads).
export function uploadDir(): string {
  return (
    process.env.UPLOAD_DIR ||
    path.join(process.cwd(), "..", "aktbot-uploads")
  );
}

// المفتاح يجب أن يكون اسم ملف بسيطاً (cuid.webp) — يمنع اجتياز المسار.
const KEY_RE = /^[A-Za-z0-9_-]+\.webp$/;

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key);
}

function keyPath(key: string): string {
  if (!isValidKey(key)) throw new Error("invalid storage key");
  return path.join(uploadDir(), key);
}

export async function writeToDisk(key: string, data: Buffer): Promise<void> {
  const dir = uploadDir();
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(keyPath(key), data);
}

export async function deleteFromDisk(key: string): Promise<void> {
  try {
    await unlink(keyPath(key));
  } catch {
    // الملف غير موجود — تجاهُل (idempotent).
  }
}

export async function readFromDisk(key: string): Promise<Buffer | null> {
  try {
    return await readFile(keyPath(key));
  } catch {
    return null;
  }
}
