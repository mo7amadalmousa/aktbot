import { ContactView, contactMetadata } from "@/components/pages/views";
const locale = "tr" as const;
export const generateMetadata = () => contactMetadata(locale);
export default async function Page() {
  return <ContactView locale={locale} />;
}
