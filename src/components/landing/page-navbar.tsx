"use client";

import Link from "next/link";
import { useMessages, useLocale } from "@/components/i18n/i18n-provider";
import { localeHref } from "@/lib/i18n/paths";
import { SIGNUP_URL, LOGIN_URL } from "@/lib/site";
import { BrandLogo } from "./landing-ui";
import { ThemeToggle } from "./theme-toggle";
import { LangSwitcher } from "./lang-switcher";

// شريط بسيط للصفحات الأساسيّة/القانونيّة (بلا مبدّل الجمهور).
export function PageNavbar() {
  const nav = useMessages().landing.nav;
  const locale = useLocale();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={localeHref(locale, "/")} aria-label="AktBot">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeToggle />
          <a href={LOGIN_URL} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted sm:inline-block">
            {nav.login}
          </a>
          <a href={SIGNUP_URL} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {nav.cta}
          </a>
        </div>
      </div>
    </header>
  );
}
