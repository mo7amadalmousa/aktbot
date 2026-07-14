import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getBrandOverview, PARTICIPATION_STATUS_LABEL } from "@/lib/attribution/query";
import { StatCard, fmtNum } from "@/components/dashboard/analytics-bits";
import { formatMoney } from "@/lib/payments/money";
import {
  NewCampaignForm,
  CampaignStatusSelect,
  AddCreatorForm,
  CopyBtn,
} from "@/components/brand/brand-actions";
import { Building2, MousePointerClick, ShoppingBag, DollarSign, BadgeCheck } from "lucide-react";

export const dynamic = "force-dynamic";

function linkBase(): string {
  return (
    process.env.NEXT_PUBLIC_LINK_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    ""
  );
}

export default async function BrandPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/brand");

  const data = await getBrandOverview(session.sub);
  if (!data.brand) redirect("/become-brand");
  const base = linkBase();

  return (
    <main className="min-h-dvh w-full bg-muted/20">
      <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          <span className="font-bold text-foreground">{data.brand.brandName}</span>
          {data.brand.isVerified ? <BadgeCheck className="size-4 text-primary" /> : null}
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">علامة</span>
        </div>
        <form method="post" action="/api/auth/logout">
          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
            خروج
          </button>
        </form>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-6 p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="نقرات" value={fmtNum(data.totals.clicks)} icon={<MousePointerClick className="size-4" />} accent />
          <StatCard label="تحويلات" value={fmtNum(data.totals.conversions)} />
          <StatCard label="مبيعات" value={fmtNum(data.totals.sales)} icon={<ShoppingBag className="size-4" />} />
          <StatCard label="قيمة المبيعات" value={formatMoney(data.totals.salesValue, "USD")} icon={<DollarSign className="size-4" />} />
        </div>

        <section>
          <h1 className="mb-3 text-lg font-bold text-foreground">الحملات</h1>
          <NewCampaignForm />

          {data.campaigns.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              لا حملات بعد. أنشئ حملة ثم ادعُ مبدعين — يُولَّد لكل مبدع كود/رابط فريد.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {data.campaigns.map((c) => {
                const pct = c.budgetAmount ? Math.min(100, Math.round((c.spentAmount / c.budgetAmount) * 100)) : 0;
                return (
                  <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-foreground">{c.title}</h2>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{c.typeLabel}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {fmtNum(c.totals.clicks)} نقرة · {fmtNum(c.totals.sales)} بيع · {formatMoney(c.totals.salesValue, c.currency)}
                        </span>
                        <CampaignStatusSelect campaignId={c.id} status={c.status} />
                      </div>
                    </div>

                    {/* الميزانية والمصروف */}
                    {c.budgetAmount ? (
                      <div className="mb-3">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>المصروف: {formatMoney(c.spentAmount, c.currency)} من {formatMoney(c.budgetAmount, c.currency)}</span>
                          <span>{pct}%{pct >= 100 ? " · مستنفدة" : ""}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="mb-3 text-xs text-muted-foreground">المصروف: {formatMoney(c.spentAmount, c.currency)} · بلا سقف ميزانيّة</p>
                    )}

                    {c.participations.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                              <th className="p-2 text-start font-medium">المبدع</th>
                              <th className="p-2 text-start font-medium">الحالة</th>
                              <th className="p-2 text-start font-medium">الكود/الرابط</th>
                              <th className="p-2 text-start font-medium">نقرات</th>
                              <th className="p-2 text-start font-medium">مبيعات</th>
                              <th className="p-2 text-start font-medium">مستحقّه</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.participations.map((p) => (
                              <tr key={p.id} className="border-t border-border">
                                <td className="p-2 text-foreground">
                                  {p.creatorName}
                                  <span className="ms-1 text-[10px] text-muted-foreground">/{p.username}</span>
                                </td>
                                <td className="p-2">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.status === "ACTIVE" ? "bg-primary/10 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}>
                                    {PARTICIPATION_STATUS_LABEL[p.status] ?? p.status}
                                  </span>
                                </td>
                                <td className="p-2">
                                  <span className="font-mono text-xs text-foreground">{p.code}</span>{" "}
                                  <CopyBtn text={`${base}${p.link}`} label="نسخ الرابط" />
                                </td>
                                <td className="p-2 text-muted-foreground">{fmtNum(p.clicks)}</td>
                                <td className="p-2 text-muted-foreground">{fmtNum(p.sales)}</td>
                                <td className="p-2 font-medium text-foreground">{formatMoney(p.payoutAccrued, c.currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">لا مبدعين في هذه الحملة بعد.</p>
                    )}

                    <AddCreatorForm campaignId={c.id} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          كل مبدع×حملة له كود/رابط فريد. النقر يُسجّل CLICK، والشراء عبر الرابط/الكود يُسنِد
          البيع ويربط العمولة بالحملة (طبقة العمولة). الحملات الكاملة (ميزانية/شروط) لاحقاً.
        </p>
      </div>
    </main>
  );
}
