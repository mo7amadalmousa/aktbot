"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n/config";
import { dirFor } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/types";
import type { Overrides } from "@/lib/cms/fields";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { CmsProvider } from "@/components/cms/cms-provider";
import { PageNavbar } from "./page-navbar";
import { SiteFooter } from "./site-footer";
import { SmoothScroll } from "./smooth-scroll";

// شِل الصفحات الأساسيّة/القانونيّة — نفس نظام المحتوى (قابل للتحرير) + شريط/فوتر.
export function PageShell({
  locale,
  messages,
  isAdmin,
  published,
  draft,
  pageKey,
  children,
}: {
  locale: Locale;
  messages: Messages;
  isAdmin: boolean;
  published: Overrides;
  draft: Overrides;
  pageKey: string;
  children: React.ReactNode;
}) {
  const dir = dirFor(locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <CmsProvider pageKey={pageKey} locale={locale} isAdmin={isAdmin} published={published} draft={draft}>
        <div dir={dir} className="flex min-h-dvh flex-col bg-background text-foreground">
          <SmoothScroll />
          <PageNavbar />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </CmsProvider>
    </I18nProvider>
  );
}
