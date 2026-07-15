import { AboutView, aboutMetadata } from "@/components/pages/views";
const locale = "ar" as const;
export const generateMetadata = () => aboutMetadata(locale);
export default async function Page() {
  return <AboutView locale={locale} />;
}
