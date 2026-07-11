import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// محميّة: تُنفَّذ عند الطلب وتقرأ الجلسة.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // حماية دفاعيّة (إضافة إلى proxy): بلا جلسة → تسجيل الدخول.
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { displayName: true, username: true },
  });

  const displayName = profile?.displayName ?? session.email;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            A
          </span>
          <span className="font-bold text-foreground">AktBot</span>
        </div>
        <form method="post" action="/api/auth/logout">
          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            تسجيل الخروج
          </button>
        </form>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">مرحباً</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">
            {displayName}
          </h1>
          {profile?.username ? (
            <p className="mt-3 text-sm text-muted-foreground">
              صفحتك العامّة (قريباً):{" "}
              <span className="font-medium text-primary">
                aktbot.link/{profile.username}
              </span>
            </p>
          ) : null}
          <p className="mt-6 text-sm text-muted-foreground">
            لوحة التحكّم الفعليّة تُبنى في الخطوات القادمة. جلستك تعمل ✓
          </p>
        </div>
      </main>
    </div>
  );
}
