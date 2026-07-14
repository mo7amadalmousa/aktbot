import { getPlatformCampaigns } from "@/lib/attribution/query";
import { getMessages } from "@/lib/i18n";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { PageHeader } from "@/components/console/page-header";
import { StatCard, fmtNum } from "@/components/console/stat-card";
import { CampaignsTable } from "@/components/console/tables/campaigns-table";
import { formatMoney } from "@/lib/payments/money";
import { Megaphone, PlayCircle, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

// إشراف الحملات — على أساس الكونسول الموحّد (الحماية عبر layout).
export default async function AdminCampaignsPage() {
  const [rows, m] = await Promise.all([
    getPlatformCampaigns(),
    getAppLocale().then(getMessages),
  ]);
  const t = m.admin.campaigns;

  const activeCount = rows.filter((r) => r.status === "ACTIVE").length;
  // إجمالي الميزانيّات مجمّع حسب العملة (لا خلط).
  const budgetByCurrency = new Map<string, number>();
  for (const r of rows) {
    if (r.budgetAmount)
      budgetByCurrency.set(r.currency, (budgetByCurrency.get(r.currency) ?? 0) + r.budgetAmount);
  }
  const budgetLabel =
    budgetByCurrency.size === 0
      ? "—"
      : [...budgetByCurrency.entries()].map(([c, s]) => formatMoney(s, c)).join(" · ");

  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label={t.total} value={fmtNum(rows.length)} icon={<Megaphone className="size-4" />} accent />
        <StatCard label={t.active} value={fmtNum(activeCount)} icon={<PlayCircle className="size-4" />} />
        <StatCard label={t.totalBudget} value={budgetLabel} icon={<Wallet className="size-4" />} />
      </div>

      <CampaignsTable rows={rows} />
    </>
  );
}
