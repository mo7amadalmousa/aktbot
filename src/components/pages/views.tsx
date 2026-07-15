import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { pageMetadata } from "@/lib/i18n/metadata";
import { loadPageCms } from "@/lib/cms/server";
import { PageShell } from "@/components/landing/page-shell";
import { AboutContent } from "./about-content";
import { ContactContent } from "./contact-content";
import { LegalContent } from "./legal-content";
import type { LegalSlug } from "@/lib/i18n/paths";

// ── عارضات الصفحات الخادميّة (تحميل CMS + الشِل) + دوال الميتاداتا ──────

export async function AboutView({ locale }: { locale: Locale }) {
  const cms = await loadPageCms("about", locale);
  return (
    <PageShell locale={locale} messages={getMessages(locale)} isAdmin={cms.isAdmin} published={cms.published} draft={cms.draft} pageKey="about">
      <AboutContent />
    </PageShell>
  );
}
export function aboutMetadata(locale: Locale): Metadata {
  const m = getMessages(locale).landing.pages.about;
  return pageMetadata(locale, "/about", m.metaTitle, m.metaDesc);
}

export async function ContactView({ locale }: { locale: Locale }) {
  const cms = await loadPageCms("contact", locale);
  return (
    <PageShell locale={locale} messages={getMessages(locale)} isAdmin={cms.isAdmin} published={cms.published} draft={cms.draft} pageKey="contact">
      <ContactContent />
    </PageShell>
  );
}
export function contactMetadata(locale: Locale): Metadata {
  const m = getMessages(locale).landing.pages.contact;
  return pageMetadata(locale, "/contact", m.metaTitle, m.metaDesc);
}

export async function LegalView({ locale, slug }: { locale: Locale; slug: LegalSlug }) {
  const cms = await loadPageCms(`legal-${slug}`, locale);
  return (
    <PageShell locale={locale} messages={getMessages(locale)} isAdmin={cms.isAdmin} published={cms.published} draft={cms.draft} pageKey={`legal-${slug}`}>
      <LegalContent slug={slug} />
    </PageShell>
  );
}
export function legalMetadata(locale: Locale, slug: LegalSlug): Metadata {
  const m = getMessages(locale).landing.pages.legal[slug];
  return pageMetadata(locale, `/legal/${slug}`, m.title, m.metaDesc);
}
