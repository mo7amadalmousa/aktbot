import type { Locale } from "./config";

// مسار محليّ حسب اللغة: ar بلا بادئة · en→/en · tr→/tr.
export function localeHref(locale: Locale, path: string): string {
  const p = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  if (locale === "ar") return p || "/";
  return `/${locale}${p}`;
}

export const LEGAL_SLUGS = ["privacy", "terms", "distance", "refund", "cookies"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
