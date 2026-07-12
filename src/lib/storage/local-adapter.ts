import type { StorageProvider, PutInput, PutResult } from "./types";
import { writeToDisk, deleteFromDisk } from "./disk";

// تطوير: يخزّن على القرص (UPLOAD_DIR خارج repo) ويُخدَم عبر مسار Next /api/media.
export const localStorageAdapter: StorageProvider = {
  id: "local",

  async put(input: PutInput): Promise<PutResult> {
    await writeToDisk(input.key, input.data);
    return { key: input.key, url: this.getUrl(input.key) };
  },

  async delete(key: string): Promise<void> {
    await deleteFromDisk(key);
  },

  getUrl(key: string): string {
    return `/api/media/${key}`;
  },
};
