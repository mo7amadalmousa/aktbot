import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { normalizeEmail } from "@/lib/validation";

// ── تجريد مزوّدات المصادقة ────────────────────────────────────────────
// يسمح بإضافة Google / MagicLink لاحقاً بتسجيل مزوّد جديد هنا دون تغيير المستدعي.

export type ProviderId = "credentials" | "google" | "magiclink";

export interface AuthResult {
  userId: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

export interface AuthProvider {
  readonly id: ProviderId;
  authenticate(input: Record<string, unknown>): Promise<AuthResult | null>;
}

// مزوّد بيانات الاعتماد (بريد + كلمة مرور).
export const credentialsProvider: AuthProvider = {
  id: "credentials",
  async authenticate(input) {
    const email = normalizeEmail(String(input.email ?? ""));
    const password = String(input.password ?? "");
    if (!email || !password) return null;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return null;

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  },
};

// سجلّ المزوّدات — أضف "google"/"magiclink" هنا لاحقاً.
export const authProviders: Record<ProviderId, AuthProvider | undefined> = {
  credentials: credentialsProvider,
  google: undefined,
  magiclink: undefined,
};
