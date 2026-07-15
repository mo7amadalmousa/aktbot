import { ContactView, contactMetadata } from "@/components/pages/views";
const locale = "ar" as const;
export const generateMetadata = () => contactMetadata(locale);
export default async function Page() {
  return <ContactView locale={locale} />;
}
