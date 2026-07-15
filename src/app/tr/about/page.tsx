import { AboutView, aboutMetadata } from "@/components/pages/views";
const locale = "tr" as const;
export const generateMetadata = () => aboutMetadata(locale);
export default async function Page() {
  return <AboutView locale={locale} />;
}
