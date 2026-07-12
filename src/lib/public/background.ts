import type { CSSProperties } from "react";
import { themePageBackground, type ThemeId } from "./themes";
import { safeCssUrl } from "./safe-url";

// ── محرّك الخلفية ─────────────────────────────────────────────────────
// Page.background (json): { type: "color"|"gradient"|"image"|"video", ... }
// صورة مفقودة/غير آمنة → fallback لتدرّج القالب. فيديو = بنية جاهزة، مُعطّل الآن.

export interface ResolvedBackground {
  baseStyle: CSSProperties; // على غلاف الصفحة
  imageUrl: string | null; // طبقة صورة (إن وُجدت وآمنة)
}

type BgInput = {
  type?: string;
  color?: string;
  gradient?: string;
  imageUrl?: string;
  videoUrl?: string;
};

export const SAFE_CSS_COLOR = /^#[0-9a-fA-F]{3,8}$|^rgb[a]?\([0-9.,%\s]+\)$/;
export const SAFE_CSS_GRADIENT = /^(linear|radial|conic)-gradient\([^;{}<>]*\)$/;

export function resolveBackground(
  raw: unknown,
  themeId: ThemeId,
): ResolvedBackground {
  const fallback = themePageBackground(themeId);
  const bg = (raw ?? {}) as BgInput;

  if (bg.type === "color" && typeof bg.color === "string" && SAFE_CSS_COLOR.test(bg.color.trim())) {
    return { baseStyle: { background: bg.color.trim() }, imageUrl: null };
  }

  if (
    bg.type === "gradient" &&
    typeof bg.gradient === "string" &&
    SAFE_CSS_GRADIENT.test(bg.gradient.trim())
  ) {
    return { baseStyle: { background: bg.gradient.trim() }, imageUrl: null };
  }

  if (bg.type === "image") {
    const safe = safeCssUrl(bg.imageUrl);
    // تدرّج القالب يبقى أساساً خلف الصورة (fallback عند فشل التحميل).
    return { baseStyle: { background: fallback }, imageUrl: safe };
  }

  // video: بنية جاهزة، غير مُفعّل الآن → استخدم تدرّج القالب.
  return { baseStyle: { background: fallback }, imageUrl: null };
}
