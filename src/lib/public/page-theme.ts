import type { CSSProperties } from "react";
import {
  resolveThemeId,
  themeStyleVars,
  THEME_META,
  type ThemeId,
} from "./themes";
import { SAFE_CSS_COLOR } from "./background";
import { asRecord, str, arr } from "./block-config";
import { isValidFont, DEFAULT_FONT } from "./fonts";

// ── نموذج قالب الصفحة الموسّع (كلّه في Page.theme JSON — لا أعمدة) ──────

export type LayoutId = "INK" | "TENTACLES" | "REEF" | "CORAL";
export const DEFAULT_LAYOUT: LayoutId = "INK";

export const LAYOUTS: { id: LayoutId; label: string; desc: string }[] = [
  { id: "INK", label: "Ink", desc: "بسيط · أزرار عموديّة" },
  { id: "TENTACLES", label: "Tentacles", desc: "شبكة بطاقات (Bento)" },
  { id: "REEF", label: "Reef", desc: "مجلّة · صورة بطل" },
  { id: "CORAL", label: "Coral", desc: "بطاقات بارزة" },
];
const LAYOUT_IDS = LAYOUTS.map((l) => l.id) as string[];

// مفاتيح ألوان التخصيص → متغيّرات --pp-*.
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
  id: ThemeId; // لوحة الألوان (5 قوالب لونيّة)
  layout: LayoutId;
  fontFamily: string;
  colors: Record<string, string>; // تجاوزات ألوان (اختياريّة)
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
    id: resolveThemeId(t.id),
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

// متغيّرات القالب (اللوحة اللونيّة) + تجاوزات ألوان المستخدم.
export function pageStyleVars(theme: PageTheme): CSSProperties {
  const base = { ...(themeStyleVars(theme.id) as Record<string, string>) };
  for (const [k, cssVar] of Object.entries(COLOR_MAP)) {
    if (theme.colors[k]) base[cssVar] = theme.colors[k];
  }
  return base as CSSProperties;
}

export function isFrosted(theme: PageTheme): boolean {
  return THEME_META[theme.id].frosted;
}
