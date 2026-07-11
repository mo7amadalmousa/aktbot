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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const error = str(sp.error);
  const verified = str(sp.verified) === "1";
  const reset = str(sp.reset) === "1";
  const next = str(sp.next) ?? "";

  return (
    <AuthCard
      title="تسجيل الدخول"
      subtitle="أهلاً بعودتك إلى AktBot."
      footer={
        <>
          ليس لديك حساب؟ <TextLink href="/signup">أنشئ حساباً</TextLink>
        </>
      }
    >
      {verified ? (
        <Alert kind="success">تم تأكيد بريدك. يمكنك الدخول الآن.</Alert>
      ) : null}
      {reset ? (
        <Alert kind="success">تم تحديث كلمة المرور. سجّل الدخول بها.</Alert>
      ) : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      <form method="post" action="/api/auth/login">
        {next ? <input type="hidden" name="next" value={next} /> : null}
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
          autoComplete="current-password"
          placeholder="كلمة مرورك"
        />
        <div className="mb-2 text-left">
          <TextLink href="/forgot-password">نسيت كلمة المرور؟</TextLink>
        </div>
        <SubmitButton>دخول</SubmitButton>
      </form>
    </AuthCard>
  );
}
