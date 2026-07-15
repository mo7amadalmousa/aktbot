import { mkdir, writeFile, unlink, readFile, rename, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { uploadDir } from "./disk";

// ── تخزين خاصّ لملفات المنتجات الرقميّة ───────────────────────────────
// في UPLOAD_DIR/private — لا يُخدَم عبر /api/media إطلاقاً؛ يُسلَّم فقط عبر
// مسار تحميل محميّ بعد دفع مؤكّد (DownloadToken).

function privateDir(): string {
  return path.join(uploadDir(), "private");
}

// مفتاح: uuid + امتداد آمن (لا مسارات/نقاط مزدوجة).
const PKEY_RE = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9]{1,8})?$/;

export function isValidPrivateKey(key: string): boolean {
  return PKEY_RE.test(key);
}

function keyPath(key: string): string {
  if (!isValidPrivateKey(key)) throw new Error("invalid private key");
  return path.join(privateDir(), key);
}

function extOf(fileName: string): string {
  const m = fileName.match(/\.([A-Za-z0-9]{1,8})$/);
  return m ? `.${m[1].toLowerCase()}` : "";
}

export function makePrivateKey(fileName: string): string {
  return `${randomUUID()}${extOf(fileName)}`;
}

export function maxProductBytes(): number {
  const n = Number(process.env.PRODUCT_MAX_BYTES);
  return Number.isFinite(n) && n > 0 ? n : 100 * 1024 * 1024; // 100MB
}

export async function writePrivateFile(key: string, data: Buffer): Promise<void> {
  const dir = privateDir();
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(keyPath(key), data);
}

export async function readPrivateFile(key: string): Promise<Buffer | null> {
  try {
    return await readFile(keyPath(key));
  } catch {
    return null;
  }
}

export async function deletePrivateFile(key: string): Promise<void> {
  try {
    await unlink(keyPath(key));
  } catch {}
}

// ── دعم الرفع المتدفّق + البثّ بالنطاقات (للفيديو) ────────────────────
// مسار مطلق مُتحقَّق (لا اجتياز) — للاستخدام مع تيّارات fs مباشرة.
export function privatePath(key: string): string {
  return keyPath(key);
}

export async function ensurePrivateDir(): Promise<void> {
  const dir = privateDir();
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

export async function renamePrivate(from: string, to: string): Promise<void> {
  await rename(keyPath(from), keyPath(to));
}

// حجم الملف الخاصّ (bytes) أو null إن غير موجود — لطلبات النطاق (Range).
export async function privateFileSize(key: string): Promise<number | null> {
  try {
    return (await stat(keyPath(key))).size;
  } catch {
    return null;
  }
}
