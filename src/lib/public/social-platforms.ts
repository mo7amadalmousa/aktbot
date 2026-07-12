// ── منصّات التواصل المدعومة (قابلة للتوسّع) ───────────────────────────
// pure — يستخدمها العرض والمحرّر وsanitize.

export interface SocialPlatform {
  id: string;
  label: string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: "instagram", label: "إنستغرام", placeholder: "https://instagram.com/…" },
  { id: "tiktok", label: "تيك توك", placeholder: "https://tiktok.com/@…" },
  { id: "youtube", label: "يوتيوب", placeholder: "https://youtube.com/@…" },
  { id: "snapchat", label: "سناب شات", placeholder: "https://snapchat.com/add/…" },
  { id: "x", label: "X (تويتر)", placeholder: "https://x.com/…" },
  { id: "facebook", label: "فيسبوك", placeholder: "https://facebook.com/…" },
  { id: "whatsapp", label: "واتساب", placeholder: "https://wa.me/…" },
  { id: "telegram", label: "تيليجرام", placeholder: "https://t.me/…" },
  { id: "linkedin", label: "لينكدإن", placeholder: "https://linkedin.com/in/…" },
  { id: "threads", label: "ثريدز", placeholder: "https://threads.net/@…" },
  { id: "pinterest", label: "بينترست", placeholder: "https://pinterest.com/…" },
  { id: "website", label: "موقع / رابط عام", placeholder: "https://…" },
];

export const SOCIAL_PLATFORM_IDS = SOCIAL_PLATFORMS.map((p) => p.id);

export function isKnownPlatform(id: string): boolean {
  return SOCIAL_PLATFORM_IDS.includes(id);
}

export function platformLabel(id: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)?.label ?? id;
}
