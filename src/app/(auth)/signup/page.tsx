import { AuthCard, Field, SubmitButton, Alert, TextLink } from "@/components/auth-ui";

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const error = str(sp.error);

  return (
    <AuthCard
      title="أنشئ حسابك"
      subtitle="ابدأ صفحتك على AktBot خلال دقيقة."
      footer={
        <>
          لديك حساب؟ <TextLink href="/login">تسجيل الدخول</TextLink>
        </>
      }
    >
      {error ? <Alert kind="error">{error}</Alert> : null}
      <form method="post" action="/api/auth/signup">
        <Field
          label="الاسم الظاهر"
          name="displayName"
          autoComplete="name"
          placeholder="اسمك أو اسم علامتك"
        />
        <Field
          label="اسم المستخدم"
          name="username"
          autoComplete="off"
          placeholder="username"
          hint="رابط صفحتك سيكون: aktbot.link/username"
        />
        <Field
          label="البريد الإلكتروني"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Field
          label="كلمة المرور"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="8 أحرف على الأقل"
        />
        <SubmitButton>إنشاء الحساب</SubmitButton>
      </form>
    </AuthCard>
  );
}
