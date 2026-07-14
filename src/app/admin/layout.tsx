import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { getMessages, dirFor } from "@/lib/i18n";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { ConsoleShell } from "@/components/console/console-shell";

// تخطيط الكونسول الموحّد — يلفّ كل /admin/* بالشريط الجانبيّ والرأس + i18n.
// الحماية مزدوجة: proxy يحرس /admin (ADMIN) + تحقّق هنا (defense-in-depth).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const locale = await getAppLocale();
  const messages = getMessages(locale);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <ConsoleShell email={session.email} dir={dirFor(locale)}>
        {children}
      </ConsoleShell>
    </I18nProvider>
  );
}
