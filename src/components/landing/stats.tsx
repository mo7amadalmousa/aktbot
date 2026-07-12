"use client";

import { useMessages } from "@/components/i18n/i18n-provider";
import { Reveal } from "./reveal";

export function Stats() {
  const t = useMessages().landing.stats;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <div className="rounded-3xl border border-border bg-card p-8">
          <div className="grid gap-8 sm:grid-cols-3">
            {t.items.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-extrabold text-primary">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground/70">
            {t.disclaimer}
          </p>
        </div>
      </Reveal>
    </section>
  );
}
