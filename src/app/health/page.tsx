import { prisma } from "@/lib/prisma";

// ديناميكيّة دائماً — تُنفّذ عند كل طلب لتعكس حالة القاعدة الحيّة.
export const dynamic = "force-dynamic";

type HealthState =
  | {
      connected: true;
      label: string;
      createdAt: Date;
      count: number;
    }
  | { connected: false; error: string };

async function getHealth(): Promise<HealthState> {
  try {
    // أنشئ سجلّاً أوّل إن لم يوجد أيّ سجلّ (لإثبات الكتابة).
    let latest = await prisma.healthCheck.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!latest) {
      latest = await prisma.healthCheck.create({
        data: { label: "bootstrap-check" },
      });
    }

    const count = await prisma.healthCheck.count();

    return {
      connected: true,
      label: latest.label,
      createdAt: latest.createdAt,
      count,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

export default async function HealthPage() {
  const health = await getHealth();
  const serverTime = new Date();

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none text-foreground">
              AktBot
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">فحص السلامة</p>
          </div>
        </div>

        {health.connected ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-lg font-semibold text-primary">
              <span aria-hidden>✓</span> متصل
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">قاعدة البيانات</dt>
                <dd className="font-medium text-foreground">Neon Postgres</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">عدد السجلات</dt>
                <dd className="font-medium text-foreground">{health.count}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">آخر سجلّ</dt>
                <dd className="font-medium text-foreground">{health.label}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">وقت آخر سجلّ</dt>
                <dd className="font-medium text-foreground">
                  {health.createdAt.toISOString()}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="flex items-center gap-2 text-lg font-semibold text-destructive">
              <span aria-hidden>✕</span> غير متصل
            </p>
            <p className="mt-3 break-words text-sm text-muted-foreground">
              تعذّر الاتصال بقاعدة البيانات. تأكّد من ضبط{" "}
              <code className="rounded bg-muted px-1 py-0.5">DATABASE_URL</code>.
            </p>
            <p className="mt-2 break-words font-mono text-xs text-destructive/80">
              {health.error}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          وقت الخادم: {serverTime.toISOString()}
        </p>
      </div>
    </main>
  );
}
