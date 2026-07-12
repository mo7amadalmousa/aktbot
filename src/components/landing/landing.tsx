"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n/config";
import { dirFor } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/types";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { ForCreators, ForBrands } from "./audiences";
import { Features } from "./features";
import { HowItWorks } from "./how-it-works";
import { Stats } from "./stats";
import { FinalCta } from "./final-cta";
import { Footer } from "./footer";

export function Landing({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const dir = dirFor(locale);

  // مزامنة اتّجاه/لغة الوثيقة (التخطيط الجذر ثابت ar؛ هذا يصحّح للـ/en و/tr).
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <div dir={dir} className="flex min-h-dvh flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1">
          <Hero />
          <ForCreators />
          <ForBrands />
          <Features />
          <HowItWorks />
          <Stats />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </I18nProvider>
  );
}
