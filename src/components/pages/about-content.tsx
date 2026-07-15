"use client";

import { useMessages } from "@/components/i18n/i18n-provider";
import { Reveal } from "@/components/landing/reveal";
import { EditableText, EditableSection } from "@/components/cms/editable";

// محتوى «حولنا» — قابل للتحرير موضعياً (عنوان/مقدّمة/متن/مهمّة).
export function AboutContent() {
  const t = useMessages().landing.pages.about;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <Reveal>
        <EditableText as="h1" field="about.title" def={t.title} className="block text-4xl font-extrabold tracking-tight text-foreground" />
        <EditableText as="p" field="about.intro" def={t.intro} multiline className="mt-4 block text-lg text-muted-foreground" />
      </Reveal>
      <Reveal delay={0.08}>
        <EditableText as="p" field="about.body" def={t.body} multiline className="mt-8 block leading-relaxed text-foreground" />
      </Reveal>
      <EditableSection id="about-mission" className="mt-10 rounded-2xl border border-border bg-card p-6">
        <EditableText as="h2" field="about.missionTitle" def={t.missionTitle} className="block text-xl font-bold text-primary" />
        <EditableText as="p" field="about.mission" def={t.mission} multiline className="mt-2 block text-foreground" />
      </EditableSection>
    </div>
  );
}
