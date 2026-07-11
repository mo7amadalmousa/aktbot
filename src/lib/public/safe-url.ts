// ── حرّاس الروابط الآمنة (طبقة العرض) ─────────────────────────────────
// الصفحة العامّة لا تُنفّذ أبداً روابط غير موثوقة. التنقية عند الإدخال تُبنى في
// الداشبورد (برومبت 04)؛ هذه الحرّاس دفاع عرض حتميّ ضد javascript:/data: وغيرها.

// يرجع href آمناً أو null. يسمح بـ http/https/mailto/tel والمسارات النسبية (/...).
export function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    if (["http:", "https:", "mailto:", "tel:"].includes(u.protocol)) {
      return u.toString();
    }
    return null;
  } catch {
    return null;
  }
}

// رابط صالح للاستخدام داخل CSS url(...) — يمنع الحقن (اقتباسات/أقواس/مسافات).
export function safeCssUrl(raw: unknown): string | null {
  const href = safeHref(raw);
  if (!href) return null;
  if (href.startsWith("/")) {
    return /["'()\s\\]/.test(href) ? null : href;
  }
  try {
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return /["'()\s\\]/.test(href) ? null : href;
}

// ── محلّل التضمين (EMBED) — whitelist مضيفين صارم ──────────────────────
export type EmbedProvider = "youtube" | "vimeo" | "tiktok" | "instagram";

export interface EmbedInfo {
  provider: EmbedProvider;
  embedUrl: string;
}

// المضيفون المسموح بهم (بعد إزالة www.).
export const EMBED_ALLOWED_HOSTS = [
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
  "tiktok.com",
  "instagram.com",
] as const;

function ytId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id ?? null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const seg = u.pathname.split("/").filter(Boolean);
    if (seg[0] === "shorts" || seg[0] === "embed") return seg[1] ?? null;
  }
  return null;
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function parseEmbed(raw: unknown): EmbedInfo | null {
  const href = safeHref(raw);
  if (!href || href.startsWith("/")) return null;

  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (!(EMBED_ALLOWED_HOSTS as readonly string[]).includes(host)) return null;

  // YouTube
  const yt = ytId(u);
  if (yt && ID_RE.test(yt)) {
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
    };
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const seg = u.pathname.split("/").filter(Boolean);
    const id = seg[seg.length - 1];
    if (id && /^[0-9]{4,}$/.test(id)) {
      return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` };
    }
  }

  // TikTok  (/@user/video/<id>)
  if (host === "tiktok.com") {
    const m = u.pathname.match(/\/video\/([0-9]{6,})/);
    if (m) {
      return { provider: "tiktok", embedUrl: `https://www.tiktok.com/embed/v2/${m[1]}` };
    }
  }

  // Instagram (/reel/<id>/ or /p/<id>/)
  if (host === "instagram.com") {
    const m = u.pathname.match(/\/(reel|p|tv)\/([A-Za-z0-9_-]+)/);
    if (m && ID_RE.test(m[2])) {
      return {
        provider: "instagram",
        embedUrl: `https://www.instagram.com/${m[1]}/${m[2]}/embed`,
      };
    }
  }

  return null;
}
