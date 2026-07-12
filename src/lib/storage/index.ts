import type { StorageProvider } from "./types";
import { localStorageAdapter } from "./local-adapter";
import { vpsStorageAdapter } from "./vps-adapter";

const PROVIDERS: Record<string, StorageProvider> = {
  local: localStorageAdapter,
  vps: vpsStorageAdapter,
};

export function getStorageProvider(): StorageProvider {
  const id = process.env.STORAGE_PROVIDER || "local";
  return PROVIDERS[id] ?? localStorageAdapter;
}

// هل الرابط من تخزيننا المُدار؟ (لعرضه بأمان وحذفه عند الاستبدال)
export function isManagedMediaUrl(url: string): boolean {
  const base = (process.env.MEDIA_BASE_URL || "/media").replace(/\/$/, "");
  return url.startsWith("/api/media/") || url.startsWith(`${base}/`);
}

// استخراج المفتاح من رابط مُدار (أو null).
export function keyFromManagedUrl(url: string): string | null {
  if (!isManagedMediaUrl(url)) return null;
  const key = url.split("/").pop() ?? "";
  return /^[A-Za-z0-9_-]+\.webp$/.test(key) ? key : null;
}

export * from "./types";
