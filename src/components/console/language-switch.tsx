"use client";

import { Languages } from "lucide-react";
import { useLocale, useMessages } from "@/components/i18n/i18n-provider";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";

// مبدّل لغة الكونسول (AR/EN/TR) — يضبط كوكي aktbot_locale ثم يعيد التحميل.
// (اللغة على منطقة app عبر كوكي لا مسار.)
export function LanguageSwitch() {
  const locale = useLocale();
  const t = useMessages().admin;

  const change = (next: string) => {
    if (next === locale) return;
    document.cookie = `aktbot_locale=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  return (
    <label className="inline-flex items-center gap-1.5" title={t.language}>
      <Languages className="size-4 text-muted-foreground" />
      <select
        value={locale}
        onChange={(e) => change(e.target.value)}
        aria-label={t.language}
        className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_META[l].label}
          </option>
        ))}
      </select>
    </label>
  );
}
