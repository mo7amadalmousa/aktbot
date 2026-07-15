import { getPlatformUgc } from "@/lib/campaign/ugc-query";
import { getMinUsageFees, defaultMinUsageFee } from "@/lib/campaign/ugc";
import { getMessages } from "@/lib/i18n";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { currencyList } from "@/lib/payments/money";
import { PageHeader } from "@/components/console/page-header";
import { StatCard, fmtNum } from "@/components/console/stat-card";
import { UsageFeeSettings } from "@/components/console/usage-fee-settings";
import { SubmissionsTable } from "@/components/console/tables/submissions-table";
import { Clapperboard, CheckCircle2, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

// إشراف المحتوى وحقوق الاستخدام — على أساس الكونسول (الحماية عبر layout).
export default async function AdminContentPage() {
  const [rows, fees, m] = await Promise.all([
    getPlatformUgc(),
    getMinUsageFees(),
    getAppLocale().then(getMessages),
  ]);
  const t = m.admin.content;

  const defaults: Record<string, number> = {};
  for (const c of currencyList()) defaults[c.code] = defaultMinUsageFee(c.code);

  const approved = rows.filter((r) => r.status === "APPROVED").length;
  const rightsAccepted = rows.filter((r) => r.usageStatus === "ACCEPTED").length;

  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label={t.total} value={fmtNum(rows.length)} icon={<Clapperboard className="size-4" />} accent />
        <StatCard label={t.approved} value={fmtNum(approved)} icon={<CheckCircle2 className="size-4" />} />
        <StatCard label={t.rightsAccepted} value={fmtNum(rightsAccepted)} icon={<ShieldCheck className="size-4" />} />
      </div>

      <UsageFeeSettings fees={fees} defaults={defaults} />

      <SubmissionsTable rows={rows} />
    </>
  );
}
