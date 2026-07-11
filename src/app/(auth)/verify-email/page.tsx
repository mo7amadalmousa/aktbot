import { AuthCard, Alert, TextLink } from "@/components/auth-ui";

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const sent = str(sp.sent) === "1";
  const email = str(sp.email);

  return (
    <AuthCard
      title="تأكيد بريدك الإلكتروني"
      subtitle="خطوة أخيرة لتفعيل حسابك."
      footer={
        <>
          أكّدت بريدك؟ <TextLink href="/login">تسجيل الدخول</TextLink>
        </>
      }
    >
      {sent ? (
        <Alert kind="success">
          أرسلنا رابط تأكيد{email ? ` إلى ${email}` : ""}. افتح الرابط لتفعيل
          حسابك.
        </Alert>
      ) : (
        <Alert kind="info">افتح رابط التأكيد المُرسَل إلى بريدك.</Alert>
      )}
      <p className="text-sm text-muted-foreground">
        في وضع التطوير لا يُرسَل بريد فعليّ — يظهر رابط التأكيد في{" "}
        <span className="font-medium text-foreground">كونسول الخادم</span>.
      </p>
    </AuthCard>
  );
}
