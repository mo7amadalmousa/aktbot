"use client";

import Link from "next/link";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import { localeHref, LEGAL_SLUGS } from "@/lib/i18n/paths";
import { useLocale, useMessages } from "@/components/i18n/i18n-provider";
import { BrandLogo } from "./landing-ui";

// فوتر الموقع — روابط الصفحات الأساسيّة + القانونيّة (حسب اللغة) + مبدّل اللغة.
export function SiteFooter() {
  const m = useMessages().landing;
  const locale = useLocale();
  const t = m.footer;
  const legal = m.pages.legal;

  const company = [
    { label: m.pages.about.title, href: localeHref(locale, "/about") },
    { label: m.pages.contact.title, href: localeHref(locale, "/contact") },
  ];
  const legalLinks = LEGAL_SLUGS.map((slug) => ({
    label: legal[slug].title,
    href: localeHref(locale, `/legal/${slug}`),
  }));

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1.2fr]">
          <div>
            <BrandLogo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t.tagline}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t.companyTitle}</h4>
            <ul className="mt-3 space-y-2">
              {company.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t.legalTitle}</h4>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">{t.rights}</p>
          <div className="flex items-center gap-2">
            {LOCALES.map((l) => (
              <Link
                key={l}
                href={localeHref(l, "/")}
                className={l === locale ? "text-xs font-semibold text-primary" : "text-xs text-muted-foreground hover:text-foreground"}
              >
                {LOCALE_META[l].label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
