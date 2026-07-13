import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatCard, fmtNum } from "@/components/dashboard/analytics-bits";
import { getCreatorEarnings } from "@/lib/commission/query";
import { formatMoney } from "@/lib/payments/money";
import { Wallet, Receipt, Scissors } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<string, string> = {
  ACCRUED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  SETTLED: "bg-primary/10 text-primary",
  REVERSED: "bg-muted text-muted-foreground line-through",
};

export default async function EarningsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/earnings");

  // ملكية: أرباح ملف هذا المستخدم فقط (session.sub).
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) redirect("/dashboard");

  const e = await getCreatorEarnings(profile.id);
  const cur = e.currency;

  return (
    <DashboardShell active="earnings" email={session.email}>
      <div className="flex flex-1 flex-col p-5">
        <h1 className="mb-4 text-lg font-bold text-foreground">أرباحي</h1>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="إجمالي المبيعات" value={formatMoney(e.totalGross, cur)} icon={<Receipt className="size-4" />} />
          <StatCard label="عمولة المنصّة" value={formatMoney(e.totalCommission, cur)} icon={<Scissors className="size-4" />} />
          <StatCard label="صافي أرباحي" value={formatMoney(e.totalNet, cur)} sub="مستحقّة (تُسوَّى لاحقاً)" icon={<Wallet className="size-4" />} accent />
        </div>

        {/* حسب المصدر */}
        {e.bySource.length > 0 ? (
          <div className="mb-5 rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">حسب المصدر</p>
            <div className="space-y-2">
              {e.bySource.map((s) => (
                <div key={s.saleType} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {s.label} <span className="text-xs text-muted-foreground">({s.count})</span>
                  </span>
                  <span className="text-muted-foreground">
                    مبيعات {formatMoney(s.gross, cur)} · صافٍ{" "}
                    <span className="font-medium text-foreground">{formatMoney(s.net, cur)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* سجلّ المعاملات */}
        <div className="rounded-2xl border border-border">
          <div className="border-b border-border p-3">
            <p className="text-sm font-semibold text-foreground">سجلّ المعاملات</p>
          </div>
          {e.ledger.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">
              لا مبيعات بعد. عند أوّل بيعة مؤكّدة يظهر الصافي هنا.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 text-start font-medium">المصدر</th>
                    <th className="p-3 text-start font-medium">المبلغ</th>
                    <th className="p-3 text-start font-medium">العمولة</th>
                    <th className="p-3 text-start font-medium">الصافي</th>
                    <th className="p-3 text-start font-medium">الحالة</th>
                    <th className="p-3 text-start font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {e.ledger.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-3 text-foreground">{r.label}</td>
                      <td className="p-3 text-muted-foreground">{formatMoney(r.gross, r.currency)}</td>
                      <td className="p-3 text-muted-foreground">−{formatMoney(r.commission, r.currency)}</td>
                      <td className="p-3 font-medium text-foreground">{formatMoney(r.net, r.currency)}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[r.status] ?? "bg-muted"}`}>
                          {r.statusLabel}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {r.createdAt.toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          الأرباح «مستحقّة» الآن — السحب/التسوية الفعليّة لاحقاً مع مزوّد دفع حقيقيّ.
        </p>
      </div>
    </DashboardShell>
  );
}
