"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import type { AudiencePanel as PanelMsg } from "@/lib/i18n/types";
import { Reveal } from "./reveal";
import {
  EditableText,
  EditableLink,
  EditableImage,
  EditableSection,
  EditableList,
} from "@/components/cms/editable";
import type { ListItem } from "@/lib/cms/fields";

const STAT_FIELDS = [
  { key: "value", label: "القيمة" },
  { key: "label", label: "الوصف" },
];

// لوحة جمهور كاملة (قابلة للتحرير موضعياً) — نفس التخطيط لكل جمهور، محتوى مختلف.
export function AudiencePanel({
  p, // "brands" | "creators"
  m,
  accentIcon,
}: {
  p: "brands" | "creators";
  m: PanelMsg;
  accentIcon: React.ReactNode;
}) {
  const heroImgDef =
    p === "brands"
      ? "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
      : "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80";

  const statsDef: ListItem[] = m.stats.map((s) => ({ value: s.value, label: s.label }));

  return (
    <div>
      {/* Hero */}
      <EditableSection id={`${p}-hero`} className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-80 opacity-40 blur-3xl"
          style={{ background: "radial-gradient(50% 60% at 50% 40%, rgba(39,138,143,0.35), transparent 70%)" }}
        />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
              <Sparkles className="size-3.5 text-primary" />
              <EditableText field={`${p}.hero.eyebrow`} def={m.eyebrow} />
            </span>
            <EditableText
              as="h1"
              field={`${p}.hero.title`}
              def={m.title}
              multiline
              className="mt-5 block text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
            />
            <EditableText
              as="p"
              field={`${p}.hero.sub`}
              def={m.subtitle}
              multiline
              className="mt-5 block max-w-xl text-lg leading-relaxed text-muted-foreground"
            />
            <EditableText
              as="p"
              field={`${p}.hero.tagline`}
              def={m.tagline}
              className="mt-3 block text-sm font-medium text-primary"
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <EditableLink
                field={`${p}.hero.cta`}
                defText={m.cta}
                defHref={m.ctaHref}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }} className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-2xl" aria-hidden />
            <EditableImage
              field={`${p}.hero.image`}
              def={heroImgDef}
              alt={m.title}
              className="relative w-full rounded-3xl border border-border object-cover shadow-xl"
            />
          </motion.div>
        </div>
      </EditableSection>

      {/* S1 · S2 · S3 — شبكات بطاقات */}
      {[
        { id: `${p}-s1`, titleField: `${p}.s1.title`, title: m.s1Title, items: m.s1, icon: <CheckCircle2 className="size-5 text-primary" /> },
        { id: `${p}-s2`, titleField: `${p}.s2.title`, title: m.s2Title, items: m.s2, icon: accentIcon },
        { id: `${p}-s3`, titleField: `${p}.s3.title`, title: m.s3Title, items: m.s3, icon: <Sparkles className="size-5 text-primary" /> },
      ].map((sec, si) => (
        <EditableSection key={sec.id} id={sec.id} className={si % 2 === 1 ? "bg-muted/30" : ""}>
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <Reveal>
              <EditableText
                as="h2"
                field={sec.titleField}
                def={sec.title}
                className="block text-center text-2xl font-bold text-foreground sm:text-3xl"
              />
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sec.items.map((it, i) => (
                <Reveal key={i} delay={i * 0.06}>
                  <div className="h-full rounded-2xl border border-border bg-card p-5">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10">{sec.icon}</span>
                    <h3 className="mt-3 font-semibold text-foreground">{it.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{it.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </EditableSection>
      ))}

      {/* Stats — قائمة قابلة للتحرير */}
      <EditableSection id={`${p}-stats`}>
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <EditableList
            field={`${p}.stats`}
            def={statsDef}
            listFields={STAT_FIELDS}
            render={(items) => (
              <div className="grid grid-cols-1 gap-4 rounded-3xl border border-border bg-card p-8 sm:grid-cols-3">
                {items.map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl font-extrabold text-primary sm:text-4xl">{s.value}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          />
        </div>
      </EditableSection>

      {/* Final CTA */}
      <EditableSection id={`${p}-final`}>
        <div className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6">
          <Reveal>
            <EditableText as="h2" field={`${p}.final.title`} def={m.finalTitle} className="block text-3xl font-extrabold text-foreground sm:text-4xl" />
            <EditableText as="p" field={`${p}.final.sub`} def={m.finalSub} className="mx-auto mt-4 block max-w-xl text-muted-foreground" />
            <div className="mt-8 flex justify-center">
              <EditableLink
                field={`${p}.final.cta`}
                defText={m.finalCta}
                defHref={m.ctaHref}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              />
            </div>
          </Reveal>
        </div>
      </EditableSection>
    </div>
  );
}
