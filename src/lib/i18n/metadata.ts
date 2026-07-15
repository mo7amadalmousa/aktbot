import type { Metadata } from "next";
import { LOCALES, type Locale } from "./config";
import { localeHref } from "./paths";

const OG_LOCALE: Record<Locale, string> = { ar: "ar_AR", en: "en_US", tr: "tr_TR" };

// ميتاداتا موحّدة لكل صفحة/لغة — canonical + hreflang لكل اللغات + OG.
export function pageMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string,
): Metadata {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localeHref(l, path);
  return {
    title,
    description,
    alternates: { canonical: localeHref(locale, path), languages },
    openGraph: { title, description, type: "website", locale: OG_LOCALE[locale] },
  };
}
