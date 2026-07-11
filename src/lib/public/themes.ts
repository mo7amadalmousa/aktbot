import type { CSSProperties } from "react";

// ── محرّك القوالب (Themes) — معزول تماماً عن هوية المنصّة ──────────────
// كل قالب = مجموعة design tokens تُطبَّق كمتغيّرات CSS مُنطاقة (--pp-*) على غلاف
// الصفحة العامّة فقط. لا تلمس tokens المنصّة (--primary ...).

export type ThemeId = "photo-bg" | "sunset" | "mint" | "candy" | "mono";

export const DEFAULT_THEME: ThemeId = "sunset";

export const THEME_IDS: ThemeId[] = [
  "photo-bg",
  "sunset",
  "mint",
  "candy",
  "mono",
];

export const THEME_META: Record<
  ThemeId,
  { label: string; frosted: boolean }
> = {
  "photo-bg": { label: "صورة الخلفية", frosted: true },
  sunset: { label: "غروب", frosted: false },
  mint: { label: "نعناع", frosted: false },
  candy: { label: "حلوى", frosted: false },
  mono: { label: "أحادي", frosted: false },
};

// قيم المتغيّرات لكل قالب.
const THEME_VARS: Record<ThemeId, Record<string, string>> = {
  "photo-bg": {
    "--pp-page-bg": "linear-gradient(135deg,#1f2937,#0f172a)",
    "--pp-surface": "rgba(255,255,255,0.12)",
    "--pp-surface-border": "rgba(255,255,255,0.22)",
    "--pp-text": "#ffffff",
    "--pp-muted": "rgba(255,255,255,0.75)",
    "--pp-btn-bg": "rgba(255,255,255,0.16)",
    "--pp-btn-text": "#ffffff",
    "--pp-btn-border": "rgba(255,255,255,0.28)",
    "--pp-btn-hover": "rgba(255,255,255,0.28)",
    "--pp-radius": "1rem",
    "--pp-btn-radius": "0.9rem",
    "--pp-accent": "#ffffff",
    "--pp-shadow": "0 8px 30px rgba(0,0,0,0.25)",
  },
  sunset: {
    "--pp-page-bg": "linear-gradient(160deg,#ff7e5f,#feb47b 42%,#ff5f9e)",
    "--pp-surface": "rgba(255,255,255,0.92)",
    "--pp-surface-border": "rgba(255,255,255,0.6)",
    "--pp-text": "#3b2a2f",
    "--pp-muted": "#7a5c63",
    "--pp-btn-bg": "#ffffff",
    "--pp-btn-text": "#d6336c",
    "--pp-btn-border": "transparent",
    "--pp-btn-hover": "#fff0f5",
    "--pp-radius": "1.25rem",
    "--pp-btn-radius": "999px",
    "--pp-accent": "#ff5f9e",
    "--pp-shadow": "0 10px 30px rgba(214,51,108,0.22)",
  },
  mint: {
    "--pp-page-bg": "linear-gradient(160deg,#a8edea,#5eead4 45%,#34d399)",
    "--pp-surface": "rgba(255,255,255,0.92)",
    "--pp-surface-border": "rgba(255,255,255,0.6)",
    "--pp-text": "#06403a",
    "--pp-muted": "#3f6f68",
    "--pp-btn-bg": "#0f766e",
    "--pp-btn-text": "#ffffff",
    "--pp-btn-border": "transparent",
    "--pp-btn-hover": "#0d5f59",
    "--pp-radius": "1.25rem",
    "--pp-btn-radius": "0.9rem",
    "--pp-accent": "#10b981",
    "--pp-shadow": "0 10px 30px rgba(16,185,129,0.2)",
  },
  candy: {
    "--pp-page-bg": "linear-gradient(160deg,#fbc2eb,#a6c1ee 55%,#c471f5)",
    "--pp-surface": "rgba(255,255,255,0.9)",
    "--pp-surface-border": "rgba(255,255,255,0.55)",
    "--pp-text": "#4a2b5f",
    "--pp-muted": "#7b5a8c",
    "--pp-btn-bg": "#a855f7",
    "--pp-btn-text": "#ffffff",
    "--pp-btn-border": "transparent",
    "--pp-btn-hover": "#9333ea",
    "--pp-radius": "1.5rem",
    "--pp-btn-radius": "999px",
    "--pp-accent": "#ec4899",
    "--pp-shadow": "0 12px 34px rgba(168,85,247,0.25)",
  },
  mono: {
    "--pp-page-bg": "#ffffff",
    "--pp-surface": "#ffffff",
    "--pp-surface-border": "#111111",
    "--pp-text": "#111111",
    "--pp-muted": "#666666",
    "--pp-btn-bg": "#111111",
    "--pp-btn-text": "#ffffff",
    "--pp-btn-border": "#111111",
    "--pp-btn-hover": "#333333",
    "--pp-radius": "0.25rem",
    "--pp-btn-radius": "0.25rem",
    "--pp-accent": "#111111",
    "--pp-shadow": "none",
  },
};

// تحقّق مُعرّف القالب مع fallback للافتراضي.
export function resolveThemeId(raw: unknown): ThemeId {
  if (typeof raw === "string" && (THEME_IDS as string[]).includes(raw)) {
    return raw as ThemeId;
  }
  return DEFAULT_THEME;
}

// متغيّرات القالب كـ style object (تُطبَّق على غلاف الصفحة).
export function themeStyleVars(id: ThemeId): CSSProperties {
  return THEME_VARS[id] as CSSProperties;
}

export function themePageBackground(id: ThemeId): string {
  return THEME_VARS[id]["--pp-page-bg"];
}
