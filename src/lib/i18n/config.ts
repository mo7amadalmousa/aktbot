// ── إعداد i18n معياريّ للمنصّة (قابل للتوسّع بنطاقات: landing · dashboard · …) ──

export const LOCALES = ["ar", "en", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ar";

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

// بيانات كل لغة: التسمية الأصليّة + المسار على الموقع التسويقيّ.
export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; path: string; dir: "rtl" | "ltr" }
> = {
  ar: { label: "العربية", nativeLabel: "ع", path: "/", dir: "rtl" },
  en: { label: "English", nativeLabel: "EN", path: "/en", dir: "ltr" },
  tr: { label: "Türkçe", nativeLabel: "TR", path: "/tr", dir: "ltr" },
};
