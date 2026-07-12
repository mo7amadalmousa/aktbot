"use client";

import type { LucideIcon } from "lucide-react";
import {
  Palette,
  Stethoscope,
  CalendarClock,
  BarChart3,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMessages } from "@/components/i18n/i18n-provider";
import { SectionHeading } from "./landing-ui";
import { Reveal } from "./reveal";

export function Features() {
  const t = useMessages().landing.features;
  const icons: LucideIcon[] = [
    Palette,
    Stethoscope,
    CalendarClock,
    BarChart3,
    Sparkles,
    Zap,
  ];

  return (
    <section id="features" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <SectionHeading title={t.title} subtitle={t.subtitle} />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {t.items.map((it, i) => {
          const Icon = icons[i] ?? Sparkles;
          return (
            <Reveal key={i} delay={(i % 3) * 0.05}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{it.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{it.desc}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
