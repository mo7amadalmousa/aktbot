import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/config";
import { localeHref, LEGAL_SLUGS } from "@/lib/i18n/paths";

function baseUrl(): string {
  const b =
    process.env.NEXT_PUBLIC_MARKETING_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3009";
  return b.replace(/\/$/, "");
}

// خريطة الموقع — كل الصفحات العامّة × كل اللغات.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const paths = ["/", "/about", "/contact", ...LEGAL_SLUGS.map((s) => `/legal/${s}`)];
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of LOCALES) {
    for (const p of paths) {
      entries.push({
        url: `${base}${localeHref(locale, p)}`,
        changeFrequency: p === "/" ? "weekly" : "monthly",
        priority: p === "/" ? 1 : 0.6,
      });
    }
  }
  return entries;
}
