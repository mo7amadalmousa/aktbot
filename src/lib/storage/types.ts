// ── تخزين محايد (Storage Abstraction) — مثل طبقة الدفع ────────────────
// التطبيق لا يعرف أين تُخزَّن الصور. adapters: local (تطوير) · vps (إنتاج) ·
// R2/S3 لاحقاً — خلف نفس الواجهة، تُختار عبر STORAGE_PROVIDER.

export interface PutInput {
  key: string; // اسم عشوائيّ (cuid.webp)
  data: Buffer;
  contentType: string;
}

export interface PutResult {
  key: string;
  url: string; // رابط عرض الصورة
}

export interface StorageProvider {
  readonly id: string;
  put(input: PutInput): Promise<PutResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}
