import {
  AuthCard,
  Field,
  SubmitButton,
  Alert,
  TextLink,
} from "@/components/auth-ui";

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const sent = str(sp.sent) === "1";
  const error = str(sp.error);

  return (
    <AuthCard
      title="استعادة كلمة المرور"
      subtitle="أدخل بريدك لإرسال رابط إعادة التعيين."
      footer={
        <>
          تذكّرت كلمة المرور؟ <TextLink href="/login">تسجيل الدخول</TextLink>
        </>
      }
    >
      {sent ? (
        <Alert kind="success">
          إن كان هذا البريد مسجّلاً لدينا، فقد أرسلنا إليه رابط استعادة. تفقّد
          بريدك (وفي التطوير: كونسول الخادم).
        </Alert>
      ) : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      {!sent ? (
        <form method="post" action="/api/auth/forgot-password">
          <Field
            label="البريد الإلكتروني"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <SubmitButton>إرسال رابط الاستعادة</SubmitButton>
        </form>
      ) : null}
    </AuthCard>
  );
}
