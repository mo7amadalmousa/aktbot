"use client";

import { useState } from "react";
import Link from "next/link";
import { Languages, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import { useLocale, useMessages } from "@/components/i18n/i18n-provider";

// مبدّل اللغة — روابط تنقّل ناعم إلى /، /en، /tr (SSR لكل لغة). الاتجاه من الوجهة.
export function LangSwitcher() {
  const locale = useLocale();
  const label = useMessages().landing.nav.language;
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label={label}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Languages className="size-4" />
        <span>{LOCALE_META[locale].nativeLabel}</span>
      </button>

      {open ? (
        <div className="absolute end-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {LOCALES.map((l) => (
            <Link
              key={l}
              href={LOCALE_META[l].path}
              className={cn(
                "flex items-center justify-between px-3 py-2 text-sm hover:bg-muted",
                l === locale
                  ? "font-semibold text-primary"
                  : "text-foreground",
              )}
            >
              {LOCALE_META[l].label}
              {l === locale ? <Check className="size-4" /> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
