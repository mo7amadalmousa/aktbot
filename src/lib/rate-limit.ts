// حدّ معدّل عامّ في الذاكرة (لكل مفتاح: IP/مستخدم). يُعاد الضبط عند إعادة التشغيل.
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

// IP الطالب من ترويسات البروكسي (fallback ثابت محلياً).
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}
