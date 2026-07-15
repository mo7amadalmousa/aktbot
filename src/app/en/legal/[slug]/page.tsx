import { notFound } from "next/navigation";
import { LegalView, legalMetadata } from "@/components/pages/views";
import { LEGAL_SLUGS, type LegalSlug } from "@/lib/i18n/paths";
const locale = "en" as const;
function valid(s: string): s is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(s);
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return valid(slug) ? legalMetadata(locale, slug) : {};
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!valid(slug)) notFound();
  return <LegalView locale={locale} slug={slug} />;
}
