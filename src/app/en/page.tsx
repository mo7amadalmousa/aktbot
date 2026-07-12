import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";
import { Landing } from "@/components/landing/landing";

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
    openGraph: {
      title: m.title,
      description: m.description,
      locale: "en_US",
      type: "website",
    },
  };
}

export default function Page() {
  return <Landing locale={locale} messages={getMessages(locale)} />;
}
