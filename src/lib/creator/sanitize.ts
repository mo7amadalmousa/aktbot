import { safeHref, parseEmbed } from "@/lib/public/safe-url";
import { SAFE_CSS_COLOR, SAFE_CSS_GRADIENT } from "@/lib/public/background";
import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { resolvePageTheme } from "@/lib/public/page-theme";
import { isKnownPlatform } from "@/lib/public/social-platforms";
import { isSupportedCurrency } from "@/lib/payments/money";
import { isManagedMediaUrl } from "@/lib/storage";
import {
  normalizeUsername,
  validateUsername,
} from "@/lib/validation";
import { ALL_BLOCK_TYPES } from "@/lib/creator/editor-types";

// ── S7: تنقية إدخال المبدع (طبقة خادميّة إلزاميّة) ────────────────────
// كل رابط http(s) فقط؛ javascript:/data:/غيرها → رفض الحفظ (لا يصل القاعدة).
// EMBED يجب أن يمرّ whitelist. تُرمى SanitizeError → يردّها المسار 422.

export class SanitizeError extends Error {}

// رابط ويب (http/https فقط) أو null. يرفض المسارات النسبية وmailto/tel للمحتوى.
function webUrl(raw: unknown): string | null {
  const s = safeHref(raw);
  if (!s) return null;
  if (!/^https?:\/\//.test(s)) return null;
  return s;
}

// رابط زر: http/https + mailto/tel مسموحة (تواصل).
function linkUrl(raw: unknown): string | null {
  const s = safeHref(raw);
  if (!s || s.startsWith("/")) return null;
  return s;
}

function requireWeb(raw: unknown, field: string): string {
  const u = webUrl(raw);
  if (!u) throw new SanitizeError(`${field}: رابط غير صالح (http/https فقط).`);
  return u;
}

// (avatar يستخدم optionalImage أدناه — يقبل روابط التخزين المُدارة)

// رابط صورة: يقبل http(s) أو رابط تخزين مُدار (/api/media/... أو /media/...).
function imageUrl(raw: unknown): string | null {
  const s = safeHref(raw);
  if (!s) return null;
  if (isManagedMediaUrl(s)) return s;
  if (/^https?:\/\//.test(s)) return s;
  return null;
}

function optionalImage(raw: unknown, field: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const u = imageUrl(raw);
  if (!u) throw new SanitizeError(`${field}: رابط صورة غير صالح.`);
  return u;
}

const VALID_TYPES = new Set<string>(ALL_BLOCK_TYPES);

const SOCIAL_KEYS = [
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "twitter",
  "facebook",
  "website",
];

function sanitizeSocial(raw: unknown): Record<string, string> {
  const r = asRecord(raw);
  const out: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    const v = r[key];
    if (v === undefined || v === null || v === "") continue;
    out[key] = requireWeb(v, `رابط ${key}`);
  }
  return out;
}

function sanitizeBlockConfig(type: string, config: unknown): unknown {
  const c = asRecord(config);
  switch (type) {
    case "LINK": {
      const url = linkUrl(c.url);
      if (!url) throw new SanitizeError("رابط الزر غير صالح (http/https فقط).");
      return {
        label: str(c.label).slice(0, 120) || "رابط",
        url,
        subtitle: str(c.subtitle).slice(0, 160),
      };
    }
    case "EMBED": {
      const embed = parseEmbed(c.url);
      if (!embed) {
        throw new SanitizeError(
          "رابط التضمين غير مدعوم (YouTube/Vimeo/TikTok/Instagram فقط).",
        );
      }
      const url = requireWeb(c.url, "رابط التضمين");
      return { url, title: str(c.title).slice(0, 160) };
    }
    case "GALLERY": {
      const images = arr(c.images)
        .map((it) => {
          const r = asRecord(it);
          const u = imageUrl(r.url);
          return u ? { url: u, alt: str(r.alt).slice(0, 160) } : null;
        })
        .filter((x): x is { url: string; alt: string } => x !== null)
        .slice(0, 12);
      return { title: str(c.title).slice(0, 120), images };
    }
    case "FORM": {
      const allowed = ["text", "email", "textarea", "tel", "number"];
      const fields = arr(c.fields)
        .map((f) => {
          const r = asRecord(f);
          const t = str(r.type);
          return {
            label: str(r.label).slice(0, 80) || "حقل",
            type: allowed.includes(t) ? t : "text",
            placeholder: str(r.placeholder).slice(0, 120),
          };
        })
        .slice(0, 12);
      return {
        title: str(c.title).slice(0, 120) || "تواصل",
        submitLabel: str(c.submitLabel).slice(0, 60) || "إرسال",
        fields,
      };
    }
    case "CONSULTATION":
    case "PAID_VIDEO": {
      const price = num(c.price);
      if (price === null || price <= 0) {
        throw new SanitizeError("السعر يجب أن يكون رقماً أكبر من صفر.");
      }
      const currency = str(c.currency) || "USD";
      if (!isSupportedCurrency(currency)) {
        throw new SanitizeError("عملة غير مدعومة (USD أو TRY).");
      }
      const thumb = imageUrl(c.thumbnailUrl);
      return {
        title:
          str(c.title).slice(0, 120) ||
          (type === "CONSULTATION" ? "استشارة" : "فيديو خاص"),
        description: str(c.description).slice(0, 400),
        price,
        currency,
        duration: str(c.duration).slice(0, 60),
        ...(thumb ? { thumbnailUrl: thumb } : {}),
      };
    }
    case "BEFORE_AFTER": {
      const orientation =
        str(c.orientation) === "vertical" ? "vertical" : "horizontal";
      return {
        beforeUrl: imageUrl(c.beforeUrl) ?? "",
        afterUrl: imageUrl(c.afterUrl) ?? "",
        beforeLabel: str(c.beforeLabel).slice(0, 40),
        afterLabel: str(c.afterLabel).slice(0, 40),
        orientation,
      };
    }
    case "STORY": {
      const mode = str(c.mode) === "VIEW_ONCE" ? "VIEW_ONCE" : "TIME_24H";
      const publishedAt = num(c.publishedAt) ?? Date.now();
      const media = arr(c.media)
        .map((it) => {
          const r = asRecord(it);
          const u = imageUrl(r.url);
          return u ? { url: u } : null;
        })
        .filter((x): x is { url: string } => x !== null)
        .slice(0, 10);
      return {
        title: str(c.title).slice(0, 120) || "ستوري",
        mode,
        publishedAt,
        media,
      };
    }
    case "STORE": {
      const products = arr(c.products)
        .map((p) => {
          const r = asRecord(p);
          const price = num(r.price);
          return {
            imageUrl: imageUrl(r.imageUrl) ?? "",
            title: str(r.title).slice(0, 120),
            url: webUrl(r.url) ?? "", // رابط خبيث/غير http(s) → يُسقَط
            currency: str(r.currency).slice(0, 8),
            ...(price !== null && price > 0 ? { price } : {}),
          };
        })
        .filter((p) => p.title || p.url || p.imageUrl)
        .slice(0, 30);
      return { title: str(c.title).slice(0, 120), products };
    }
    case "NEWSLETTER": {
      return {
        title: str(c.title).slice(0, 120) || "اشترك",
        description: str(c.description).slice(0, 300),
        buttonLabel: str(c.buttonLabel).slice(0, 40) || "اشتراك",
      };
    }
    case "QR": {
      // لا إدخال حرّ — الرمز يُولَّد لرابط الصفحة من username خادميّاً.
      return { title: str(c.title).slice(0, 120) };
    }
    case "SOCIAL": {
      const links = arr(c.links)
        .map((l) => {
          const r = asRecord(l);
          const url = webUrl(r.url); // http(s) فقط؛ رابط خبيث → يُسقَط
          if (!url) return null;
          const p = str(r.platform);
          return { platform: isKnownPlatform(p) ? p : "website", url };
        })
        .filter((x): x is { platform: string; url: string } => x !== null)
        .slice(0, 20);
      return { links };
    }
    default: {
      return {
        title: str(c.title).slice(0, 120),
        description: str(c.description).slice(0, 400),
      };
    }
  }
}

function sanitizeBackground(raw: unknown): Record<string, unknown> {
  const b = asRecord(raw);
  const type = str(b.type);
  if (type === "color") {
    const color = str(b.color).trim();
    if (SAFE_CSS_COLOR.test(color)) return { type: "color", color };
    return {};
  }
  if (type === "gradient") {
    const g = str(b.gradient).trim();
    if (SAFE_CSS_GRADIENT.test(g)) return { type: "gradient", gradient: g };
    return {};
  }
  if (type === "image") {
    const url = imageUrl(b.imageUrl);
    if (!url) {
      throw new SanitizeError("رابط صورة الخلفية غير صالح.");
    }
    return { type: "image", imageUrl: url };
  }
  // فارغ/فيديو (معطّل) → افتراضي القالب.
  return {};
}

export interface CleanBlock {
  id?: string;
  type: string;
  config: unknown;
  visibility: boolean;
  order: number;
}

export interface CleanSave {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  username: string;
  socialLinks: Record<string, string>;
  isPublished: boolean;
  theme: Record<string, unknown>;
  background: Record<string, unknown>;
  blocks: CleanBlock[];
}

// قالب الصفحة الموسّع (layout/ألوان/خط/تبويبات) + تنقية رابط Sticky CTA.
function sanitizeTheme(raw: unknown): Record<string, unknown> {
  const t = resolvePageTheme(raw);
  const stickyUrl = t.stickyCta.url ? webUrl(t.stickyCta.url) : null;
  return {
    id: t.id,
    layout: t.layout,
    fontFamily: t.fontFamily,
    colors: t.colors,
    tabs: t.tabs,
    stickyCta: {
      enabled: t.stickyCta.enabled,
      ...(t.stickyCta.blockId ? { blockId: t.stickyCta.blockId } : {}),
      ...(t.stickyCta.label ? { label: t.stickyCta.label } : {}),
      ...(stickyUrl ? { url: stickyUrl } : {}),
    },
  };
}

export function sanitizeSave(raw: unknown): CleanSave {
  const p = asRecord(raw);
  const profile = asRecord(p.profile);

  const displayName = str(profile.displayName).trim();
  if (!displayName) throw new SanitizeError("الاسم الظاهر مطلوب.");

  const username = normalizeUsername(str(profile.username));
  const uv = validateUsername(username);
  if (!uv.ok) throw new SanitizeError(uv.error);

  const blocks = arr(p.blocks).map((b, i): CleanBlock => {
    const r = asRecord(b);
    const type = str(r.type);
    if (!VALID_TYPES.has(type)) {
      throw new SanitizeError("نوع بلوك غير معروف.");
    }
    const cfg = sanitizeBlockConfig(type, r.config) as Record<string, unknown>;
    const tabId = str(asRecord(r.config).tabId); // إسناد التبويب
    if (tabId) cfg.tabId = tabId.slice(0, 40);
    return {
      id: typeof r.id === "string" ? r.id : undefined,
      type,
      config: cfg,
      visibility: r.visibility !== false,
      order: i,
    };
  });

  return {
    displayName: displayName.slice(0, 120),
    bio: str(profile.bio).slice(0, 600) || null,
    avatarUrl: optionalImage(profile.avatarUrl, "الأفاتار"),
    username,
    socialLinks: sanitizeSocial(profile.socialLinks),
    isPublished: Boolean(profile.isPublished),
    theme: sanitizeTheme(p.theme),
    background: sanitizeBackground(p.background),
    blocks,
  };
}
