import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";
import { loadPageCms } from "@/lib/cms/server";
import { SplitLanding } from "@/components/landing/split-landing";

const locale = "en" as const;

export function generateMetadata(): Metadata {
  const m = getMessages(locale).landing.meta;
  return {
    title: m.title,
    description: m.description,
    alternates: {
      canonical: "/en",
      languages: { ar: "/", en: "/en", tr: "/tr" },
    },
    openGraph: { title: m.title, description: m.description, locale: "en_US", type: "website" },
  };
}

export default async function Page() {
  const cms = await loadPageCms("landing", locale);
  return (
    <SplitLanding
      locale={locale}
      messages={getMessages(locale)}
      isAdmin={cms.isAdmin}
      published={cms.published}
      draft={cms.draft}
    />
  );
}
