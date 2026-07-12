"use client";

import Link from "next/link";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import { useLocale, useMessages } from "@/components/i18n/i18n-provider";
import { BrandLogo } from "./landing-ui";

export function Footer() {
  const t = useMessages().landing.footer;
  const locale = useLocale();

  const columns = [
    { title: t.productTitle, items: t.product },
    { title: t.companyTitle, items: t.company },
    { title: t.legalTitle, items: t.legal },
  ];

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <BrandLogo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {t.tagline}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">
                {col.title}
              </h4>
              <ul className="mt-3 space-y-2">
                {col.items.map((item) => (
                  <li key={item}>
                    {/* روابط تجريبيّة حتى الإطلاق */}
                    <span className="cursor-default text-sm text-muted-foreground hover:text-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">{t.rights}</p>
          <div className="flex items-center gap-2">
            {LOCALES.map((l) => (
              <Link
                key={l}
                href={LOCALE_META[l].path}
                className={
                  l === locale
                    ? "text-xs font-semibold text-primary"
                    : "text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {LOCALE_META[l].label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
          {t.placeholderNote}
        </p>
      </div>
    </footer>
  );
}
