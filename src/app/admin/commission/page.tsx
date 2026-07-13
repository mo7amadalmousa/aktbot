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

  const maxCount = Math.max(1, ...ledger.seriesCount.map((s) => s.count));

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
        {/* نظرة السجلّ الكلّي — مجمّعة حسب العملة (لا خلط) */}
        <section>
          <h1 className="mb-3 text-lg font-bold text-foreground">
            سجلّ عمولات المنصّة{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({fmtNum(ledger.txCount)} معاملة)
            </span>
          </h1>

          {ledger.byCurrency.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              لا معاملات بعد.
            </p>
          ) : (
            ledger.byCurrency.map((g) => (
              <div key={g.currency} className="mb-4">
                {ledger.byCurrency.length > 1 ? (
                  <p className="mb-2 text-sm font-semibold text-foreground">عملة {g.currency}</p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard label="إجمالي العمولات" value={formatMoney(g.commission, g.currency)} sub={`${fmtNum(g.count)} معاملة`} icon={<DollarSign className="size-4" />} accent />
                  <StatCard label="إجمالي المبيعات" value={formatMoney(g.gross, g.currency)} icon={<Receipt className="size-4" />} />
                  <StatCard label="متوسّط العمولة" value={g.gross > 0 ? `${((g.commission / g.gross) * 100).toFixed(1)}%` : "—"} icon={<Percent className="size-4" />} />
                </div>
                {g.bySource.length > 0 ? (
                  <div className="mt-2 rounded-2xl border border-border bg-card p-4">
                    <p className="mb-2 text-sm font-semibold text-foreground">العمولة حسب المصدر ({g.currency})</p>
                    <div className="space-y-2">
                      {g.bySource.map((s) => (
                        <div key={s.saleType} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{s.label}</span>
                          <span className="text-muted-foreground">
                            {formatMoney(s.commission, g.currency)}{" "}
                            <span className="text-xs">({s.count})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">
              اتجاه المعاملات — 14 يوماً (محايد للعملة)
            </p>
            <div className="flex h-24 items-end gap-0.5">
              {ledger.seriesCount.map((s) => (
                <div key={s.date} className="group relative flex-1" title={`${s.date}: ${s.count} معاملة`}>
                  <div className="w-full rounded-t bg-primary/70 group-hover:bg-primary" style={{ height: `${Math.max(2, (s.count / maxCount) * 100)}%` }} />
                </div>
              ))}
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
