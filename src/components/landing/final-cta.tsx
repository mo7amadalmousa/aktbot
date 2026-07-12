"use client";

import { useMessages } from "@/components/i18n/i18n-provider";
import { SIGNUP_URL } from "@/lib/site";
import { PrimaryCta, SecondaryCta } from "./landing-ui";
import { Reveal } from "./reveal";

export function FinalCta() {
  const t = useMessages().landing.finalCta;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(40% 60% at 50% 0%, rgba(255,255,255,0.6), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl font-bold sm:text-4xl">{t.title}</h2>
            <p className="mx-auto mt-3 max-w-lg text-primary-foreground/90">
              {t.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <PrimaryCta
                href={SIGNUP_URL}
                className="bg-background text-foreground hover:bg-background/90"
              >
                {t.ctaCreator}
              </PrimaryCta>
              <SecondaryCta
                href={SIGNUP_URL}
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                {t.ctaBrand}
              </SecondaryCta>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
