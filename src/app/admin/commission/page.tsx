import { prisma } from "@/lib/prisma";
import {
  CommissionRulesManager,
  type RuleView,
} from "@/components/dashboard/commission-rules-manager";
import { getPlatformCommission } from "@/lib/commission/query";
import { getMessages } from "@/lib/i18n";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { PageHeader } from "@/components/console/page-header";
import { StatCard, fmtNum } from "@/components/console/stat-card";
import { formatMoney } from "@/lib/payments/money";
import { Percent, DollarSign, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

// طبقة العمولة — على أساس الكونسول الموحّد (الحماية عبر layout).
export default async function AdminCommissionPage() {
  const [ruleRows, ledger, m] = await Promise.all([
    prisma.commissionRule.findMany({
      orderBy: [{ scope: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    }),
    getPlatformCommission(),
    getAppLocale().then(getMessages),
  ]);
  const t = m.admin.commission;

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
    <>
      <PageHeader
        title={t.title}
        description={`${t.desc} · ${fmtNum(ledger.txCount)} ${t.tx}`}
      />

      {/* نظرة السجلّ الكلّي — مجمّعة حسب العملة (لا خلط) */}
      <section className="mb-6">
        {ledger.byCurrency.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            {t.noTx}
          </p>
        ) : (
          ledger.byCurrency.map((g) => (
            <div key={g.currency} className="mb-4">
              {ledger.byCurrency.length > 1 ? (
                <p className="mb-2 text-sm font-semibold text-foreground">{g.currency}</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label={t.totalCommission} value={formatMoney(g.commission, g.currency)} sub={`${fmtNum(g.count)} ${t.tx}`} icon={<DollarSign className="size-4" />} accent />
                <StatCard label={t.totalSales} value={formatMoney(g.gross, g.currency)} icon={<Receipt className="size-4" />} />
                <StatCard label={t.avg} value={g.gross > 0 ? `${((g.commission / g.gross) * 100).toFixed(1)}%` : "—"} icon={<Percent className="size-4" />} />
              </div>
              {g.bySource.length > 0 ? (
                <div className="mt-2 rounded-2xl border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    {t.bySource} ({g.currency})
                  </p>
                  <div className="space-y-2">
                    {g.bySource.map((s) => (
                      <div key={s.saleType} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{s.label}</span>
                        <span className="text-muted-foreground">
                          {formatMoney(s.commission, g.currency)} <span className="text-xs">({s.count})</span>
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
          <p className="mb-3 text-sm font-semibold text-foreground">{t.trend}</p>
          <div className="flex h-24 items-end gap-0.5">
            {ledger.seriesCount.map((s) => (
              <div key={s.date} className="group relative flex-1" title={`${s.date}: ${s.count}`}>
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

      <p className="mt-4 text-center text-xs text-muted-foreground">{t.deferred}</p>
    </>
  );
}
