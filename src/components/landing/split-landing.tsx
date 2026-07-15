"use client";

import { useEffect } from "react";
import { TrendingUp, Wallet } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { dirFor } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/types";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { CmsProvider } from "@/components/cms/cms-provider";
import type { Overrides } from "@/lib/cms/fields";
import { AudienceProvider, useAudience } from "./audience-context";
import { SplitNavbar } from "./split-navbar";
import { SiteFooter } from "./site-footer";
import { SmoothScroll } from "./smooth-scroll";
import { AudiencePanel } from "./audience-panel";

function Panels({ m }: { m: Messages }) {
  const { audience } = useAudience();
  return (
    // كلا اللوحتين في DOM (فهرسة SEO) — النشطة ظاهرة، غير النشطة hidden.
    <div id="audience-panels">
      <div className={audience === "brands" ? "" : "hidden"} aria-hidden={audience !== "brands"}>
        <AudiencePanel p="brands" m={m.landing.split.brands} accentIcon={<TrendingUp className="size-5 text-primary" />} />
      </div>
      <div className={audience === "creators" ? "" : "hidden"} aria-hidden={audience !== "creators"}>
        <AudiencePanel p="creators" m={m.landing.split.creators} accentIcon={<Wallet className="size-5 text-primary" />} />
      </div>
    </div>
  );
}

export function SplitLanding({
  locale,
  messages,
  isAdmin,
  published,
  draft,
}: {
  locale: Locale;
  messages: Messages;
  isAdmin: boolean;
  published: Overrides;
  draft: Overrides;
}) {
  const dir = dirFor(locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <CmsProvider pageKey="landing" locale={locale} isAdmin={isAdmin} published={published} draft={draft}>
        <AudienceProvider>
          <div dir={dir} className="flex min-h-dvh flex-col bg-background text-foreground">
            <SmoothScroll />
            <SplitNavbar />
            <main className="flex-1">
              <Panels m={messages} />
            </main>
            <SiteFooter />
          </div>
        </AudienceProvider>
      </CmsProvider>
    </I18nProvider>
  );
}
