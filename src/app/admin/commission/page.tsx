import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  CommissionRulesManager,
  type RuleView,
} from "@/components/dashboard/commission-rules-manager";
import { getPlatformCommission } from "@/lib/commission/query";
import { StatCard, fmtNum } from "@/components/dashboard/analytics-bits";
import { formatMoney } from "@/lib/payments/money";
import { ArrowRight, Percent, DollarSign, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCommissionPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/commission");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const [ruleRows, ledger] = await Promise.all([
    prisma.commissionRule.findMany({
      orderBy: [{ scope: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    }),
    getPlatformCommission(),
  ]);

  const rules: RuleView[] = ruleRows.map((r) => ({
    id: r.id,
    scope: r.scope,
    targetId: r.targetId,
    saleType: r.saleType,
    percentBps: r.percentBps,
    fixedAmount: r.fixedAmount,
    priority: r.priority,
    startAt: r.startAt ? r.startAt.toISOString() : null,
    endAt: r.endAt ? r.endAt.toISOString() : null,
    isActive: r.isActive,
    label: r.label,
  }));

  const maxCommission = Math.max(1, ...ledger.series.map((s) => s.commission));

  return (
    <main className="min-h-dvh w-full bg-muted/20">
      <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-4" /> لوحة الإشراف
        </Link>
        <span className="font-bold text-foreground">طبقة العمولة</span>
        <span className="text-xs text-muted-foreground">{session.email}</span>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-6 p-5">
        {/* نظرة السجلّ الكلّي */}
        <section>
          <h1 className="mb-3 text-lg font-bold text-foreground">سجلّ عمولات المنصّة</h1>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="إجمالي العمولات" value={formatMoney(ledger.totalCommission, "USD")} sub={`${fmtNum(ledger.count)} معاملة`} icon={<DollarSign className="size-4" />} accent />
            <StatCard label="إجمالي المبيعات" value={formatMoney(ledger.totalGross, "USD")} icon={<Receipt className="size-4" />} />
            <StatCard label="متوسّط العمولة" value={ledger.totalGross > 0 ? `${((ledger.totalCommission / ledger.totalGross) * 100).toFixed(1)}%` : "—"} icon={<Percent className="size-4" />} />
          </div>

          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">العمولة حسب المصدر</p>
              {ledger.bySource.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">لا معاملات بعد.</p>
              ) : (
                <div className="space-y-2">
                  {ledger.bySource.map((s) => (
                    <div key={s.saleType} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{s.label}</span>
                      <span className="text-muted-foreground">
                        {formatMoney(s.commission, "USD")}{" "}
                        <span className="text-xs">({s.count})</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">اتجاه 14 يوماً</p>
              <div className="flex h-24 items-end gap-0.5">
                {ledger.series.map((s) => (
                  <div key={s.date} className="group relative flex-1" title={`${s.date}: ${formatMoney(s.commission, "USD")}`}>
                    <div className="w-full rounded-t bg-primary/70 group-hover:bg-primary" style={{ height: `${Math.max(2, (s.commission / maxCommission) * 100)}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* إدارة القواعد */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <CommissionRulesManager initial={rules} />
        </section>

        <p className="text-center text-xs text-muted-foreground">
          السجلّ مصدر الحقيقة للعمولات · العمولة تُحسب عند تأكيد الدفع · السحب/التسوية الفعليّة
          لاحقاً مع مزوّد حقيقيّ (mock الآن).
        </p>
      </div>
    </main>
  );
}
