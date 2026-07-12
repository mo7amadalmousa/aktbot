import type { StorageProvider, PutInput, PutResult } from "./types";
import { writeToDisk, deleteFromDisk } from "./disk";

// إنتاج (VPS): يخزّن في UPLOAD_DIR على السيرفر (خارج مسار الكود)، ويُخدَم مباشرةً
// عبر Nginx على MEDIA_BASE_URL (مثل /media) — بلا مرور بـ Next (أسرع).
function mediaBase(): string {
  return (process.env.MEDIA_BASE_URL || "/media").replace(/\/$/, "");
}

export const vpsStorageAdapter: StorageProvider = {
  id: "vps",

  async put(input: PutInput): Promise<PutResult> {
    await writeToDisk(input.key, input.data);
    return { key: input.key, url: this.getUrl(input.key) };
  },

  async delete(key: string): Promise<void> {
    await deleteFromDisk(key);
  },

  getUrl(key: string): string {
    return `${mediaBase()}/${key}`;
  },
};
