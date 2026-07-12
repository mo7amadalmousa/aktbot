"use client";

import type { LucideIcon } from "lucide-react";
import {
  Link2,
  Palette,
  CalendarClock,
  Coins,
  Users,
  Target,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { useMessages } from "@/components/i18n/i18n-provider";
import { SectionHeading } from "./landing-ui";
import { Reveal } from "./reveal";

function ItemCard({
  Icon,
  title,
  desc,
  delay,
}: {
  Icon: LucideIcon;
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="flex gap-4 rounded-2xl border border-border bg-card p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
    </Reveal>
  );
}

export function ForCreators() {
  const t = useMessages().landing.creators;
  const icons: LucideIcon[] = [Link2, Palette, CalendarClock, Coins];
  return (
    <section id="creators" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <SectionHeading badge={t.badge} title={t.title} subtitle={t.subtitle} />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {t.items.map((it, i) => (
          <ItemCard
            key={i}
            Icon={icons[i] ?? Link2}
            title={it.title}
            desc={it.desc}
            delay={i * 0.05}
          />
        ))}
      </div>
    </section>
  );
}

export function ForBrands() {
  const t = useMessages().landing.brands;
  const icons: LucideIcon[] = [Users, Target, ShieldCheck, ClipboardList];
  return (
    <section
      id="brands"
      className="border-y border-border bg-muted/30"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading badge={t.badge} title={t.title} subtitle={t.subtitle} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {t.items.map((it, i) => (
            <ItemCard
              key={i}
              Icon={icons[i] ?? Users}
              title={it.title}
              desc={it.desc}
              delay={i * 0.05}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
