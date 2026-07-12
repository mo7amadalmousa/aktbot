"use client";

import { useMessages } from "@/components/i18n/i18n-provider";
import { SectionHeading } from "./landing-ui";
import { Reveal } from "./reveal";

export function HowItWorks() {
  const t = useMessages().landing.how;

  return (
    <section
      id="how"
      className="border-y border-border bg-muted/30"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading title={t.title} subtitle={t.subtitle} />
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {t.steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="relative text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
