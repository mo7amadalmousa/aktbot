import type { CSSProperties } from "react";
import { SAFE_CSS_COLOR } from "./background";
import { asRecord, str, arr } from "./block-config";
import { isValidFont, DEFAULT_FONT } from "./fonts";

// ── نموذج قالب الصفحة — التخطيط مصدر لوحة الألوان (مطابق aktbot-templates-preview-v2) ──
// كل layout يحمل توقيعه اللونيّ الكامل (--pp-*)؛ التخصيص يتجاوز مفاتيح مفردة.

export type LayoutId = "INK" | "TENTACLES" | "REEF" | "CORAL";
export const DEFAULT_LAYOUT: LayoutId = "INK";

const TEAL = "#278A8F";

export const LAYOUTS: { id: LayoutId; label: string; desc: string }[] = [
  { id: "INK", label: "Ink", desc: "أنيق · أزرار عموديّة على خلفية فاتحة" },
  { id: "TENTACLES", label: "Tentacles", desc: "شبكة Bento داكنة حديثة" },
  { id: "REEF", label: "Reef", desc: "تحريريّ · صورة بطل + عدّادات" },
  { id: "CORAL", label: "Coral", desc: "بطاقات بارزة على تدرّج Teal" },
];
const LAYOUT_IDS = LAYOUTS.map((l) => l.id) as string[];

// dark = خلفية داكنة (لتراكب داكن فوق صورة الخلفية).
export const LAYOUT_META: Record<LayoutId, { dark: boolean; heroAvatar: boolean }> = {
  INK: { dark: false, heroAvatar: false },
  TENTACLES: { dark: true, heroAvatar: false },
  REEF: { dark: false, heroAvatar: true },
  CORAL: { dark: true, heroAvatar: false },
};

// لوحات الألوان الكاملة لكل تخطيط (مطابقة v2).
const LAYOUT_VARS: Record<LayoutId, Record<string, string>> = {
  INK: {
    "--pp-page-bg": "#FBFBFA",
    "--pp-surface": "#ffffff",
    "--pp-surface-border": "#ECEDED",
    "--pp-text": "#1a1a1a",
    "--pp-muted": "#666666",
    "--pp-btn-bg": TEAL,
    "--pp-btn-text": "#ffffff",
    "--pp-btn-border": "transparent",
    "--pp-radius": "14px",
    "--pp-btn-radius": "14px",
    "--pp-accent": TEAL,
    "--pp-shadow": "0 1px 3px rgba(0,0,0,0.06)",
    "--pp-cta-bg": TEAL,
    "--pp-cta-text": "#ffffff",
  },
  TENTACLES: {
    "--pp-page-bg": "#0E0E10",
    "--pp-surface": "#1A1A1E",
    "--pp-surface-border": "#26262b",
    "--pp-text": "#ffffff",
    "--pp-muted": "#9a9a9e",
    "--pp-btn-bg": TEAL,
    "--pp-btn-text": "#ffffff",
    "--pp-btn-border": "transparent",
    "--pp-radius": "15px",
    "--pp-btn-radius": "12px",
    "--pp-accent": TEAL,
    "--pp-shadow": "none",
    "--pp-cta-bg": TEAL,
    "--pp-cta-text": "#ffffff",
  },
  REEF: {
    "--pp-page-bg": "#ffffff",
    "--pp-surface": "#ffffff",
    "--pp-surface-border": "#EDEDED",
    "--pp-text": "#141414",
    "--pp-muted": "#888888",
    "--pp-btn-bg": TEAL,
    "--pp-btn-text": "#ffffff",
    "--pp-btn-border": "transparent",
    "--pp-radius": "12px",
    "--pp-btn-radius": "10px",
    "--pp-accent": TEAL,
    "--pp-shadow": "0 1px 2px rgba(0,0,0,0.05)",
    "--pp-cta-bg": TEAL,
    "--pp-cta-text": "#ffffff",
  },
  CORAL: {
    "--pp-page-bg": "linear-gradient(160deg,#278A8F,#134b4e)",
    "--pp-surface": "#ffffff",
    "--pp-surface-border": "rgba(0,0,0,0.06)",
    "--pp-text": "#1a1a1a",
    "--pp-muted": "#888888",
    "--pp-btn-bg": TEAL,
    "--pp-btn-text": "#ffffff",
    "--pp-btn-border": "transparent",
    "--pp-radius": "18px",
    "--pp-btn-radius": "999px",
    "--pp-accent": TEAL,
    "--pp-shadow": "0 8px 20px rgba(0,0,0,0.15)",
    "--pp-cta-bg": "#ffffff",
    "--pp-cta-text": "#1E6E72",
  },
};

export function layoutPageBackground(layout: LayoutId): string {
  return LAYOUT_VARS[layout]["--pp-page-bg"];
}

const COLOR_MAP: Record<string, string> = {
  bg: "--pp-page-bg",
  surface: "--pp-surface",
  text: "--pp-text",
  btn: "--pp-btn-bg",
  btnText: "--pp-btn-text",
  accent: "--pp-accent",
};
export const COLOR_KEYS = Object.keys(COLOR_MAP);

export interface StickyCta {
  enabled: boolean;
  blockId?: string;
  label?: string;
  url?: string;
}
export interface PageTabDef {
  id: string;
  label: string;
}

export interface PageTheme {
  id: string; // إرث — غير مستخدم للوحة الألوان (التخطيط هو المصدر)
  layout: LayoutId;
  fontFamily: string;
  colors: Record<string, string>;
  tabs: PageTabDef[];
  stickyCta: StickyCta;
}

export function resolvePageTheme(raw: unknown): PageTheme {
  const t = asRecord(raw);
  const layout = LAYOUT_IDS.includes(str(t.layout))
    ? (str(t.layout) as LayoutId)
    : DEFAULT_LAYOUT;

  const colorsRaw = asRecord(t.colors);
  const colors: Record<string, string> = {};
  for (const k of COLOR_KEYS) {
    const v = str(colorsRaw[k]).trim();
    if (v && SAFE_CSS_COLOR.test(v)) colors[k] = v;
  }

  const tabs = arr(t.tabs)
    .map((x) => {
      const r = asRecord(x);
      const id = str(r.id);
      const label = str(r.label).slice(0, 40);
      return id && label ? { id, label } : null;
    })
    .filter((x): x is PageTabDef => x !== null)
    .slice(0, 8);

  const sc = asRecord(t.stickyCta);

  return {
    id: str(t.id) || "default",
    layout,
    fontFamily: isValidFont(str(t.fontFamily)) ? str(t.fontFamily) : DEFAULT_FONT,
    colors,
    tabs,
    stickyCta: {
      enabled: Boolean(sc.enabled),
      blockId: str(sc.blockId) || undefined,
      label: str(sc.label).slice(0, 40) || undefined,
      url: str(sc.url) || undefined,
    },
  };
}

// متغيّرات التخطيط (لوحته) + تجاوزات ألوان المستخدم.
export function pageStyleVars(theme: PageTheme): CSSProperties {
  const base = { ...LAYOUT_VARS[theme.layout] };
  for (const [k, cssVar] of Object.entries(COLOR_MAP)) {
    if (theme.colors[k]) base[cssVar] = theme.colors[k];
  }
  return base as CSSProperties;
}

export function isDarkLayout(theme: PageTheme): boolean {
  return LAYOUT_META[theme.layout].dark;
}
