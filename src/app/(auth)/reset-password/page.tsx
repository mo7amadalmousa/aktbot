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

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const token = str(sp.token);
  const error = str(sp.error);

  if (!token) {
    return (
      <AuthCard
        title="رابط استعادة غير صالح"
        footer={<TextLink href="/forgot-password">اطلب رابطاً جديداً</TextLink>}
      >
        <Alert kind="error">
          هذا الرابط غير صالح أو ناقص. اطلب رابط استعادة جديداً.
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="تعيين كلمة مرور جديدة"
      subtitle="اختر كلمة مرور قويّة."
      footer={<TextLink href="/login">العودة لتسجيل الدخول</TextLink>}
    >
      {error ? <Alert kind="error">{error}</Alert> : null}
      <form method="post" action="/api/auth/reset-password">
        <input type="hidden" name="token" value={token} />
        <Field
          label="كلمة المرور الجديدة"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="8 أحرف على الأقل"
        />
        <SubmitButton>تحديث كلمة المرور</SubmitButton>
      </form>
    </AuthCard>
  );
}
