"use client";

import { AlertTriangle } from "lucide-react";
import { useMessages } from "@/components/i18n/i18n-provider";
import { EditableText } from "@/components/cms/editable";
import type { LegalSlug } from "@/lib/i18n/paths";

// صفحة قانونيّة — هيكل + placeholder. النصّ الفعليّ يلصقه الأدمن (تحرير موضعيّ).
// ⚠️ لا نصّ قانونيّ مُخترَع — بانتظار مراجعة المحامي.
export function LegalContent({ slug }: { slug: LegalSlug }) {
  const pages = useMessages().landing.pages;
  const meta = pages.legal[slug];
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <EditableText as="h1" field={`legal.${slug}.title`} def={meta.title} className="block text-3xl font-extrabold tracking-tight text-foreground" />

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>{pages.legalNote}</span>
      </div>

      {/* متن قابل للتحرير — يلصق الأدمن النصّ القانونيّ النهائيّ هنا */}
      <EditableText
        as="div"
        field={`legal.${slug}.body`}
        def={"— النصّ القانونيّ بانتظار مراجعة المحامي —"}
        multiline
        className="mt-8 block whitespace-pre-wrap leading-relaxed text-foreground"
      />
    </div>
  );
}
