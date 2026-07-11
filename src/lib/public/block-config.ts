// مساعدات قراءة آمنة لـ Block.config (json غير موثوق البنية).

export function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

export function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
