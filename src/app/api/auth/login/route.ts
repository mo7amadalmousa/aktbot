import { NextRequest, NextResponse } from "next/server";
import { authProviders } from "@/lib/auth/providers";
import { signSession, SESSION_COOKIE } from "@/lib/auth-edge";
import { sessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";

function back(req: NextRequest, error: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

// وجهة آمنة بعد الدخول (تمنع open-redirect: مسارات داخليّة فقط).
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? "") || null);

  const result = await authProviders.credentials!.authenticate({
    email,
    password,
  });
  if (!result) return back(req, "البريد أو كلمة المرور غير صحيحة.");

  // الدخول يتطلّب بريداً مُوثّقاً.
  if (!result.emailVerified) {
    return back(req, "يرجى تأكيد بريدك الإلكتروني أولاً.");
  }

  const token = await signSession({
    sub: result.userId,
    email: result.email,
    role: result.role,
  });

  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
