"use client";

import { DataTable, type Column } from "@/components/console/data-table";
import { useMessages } from "@/components/i18n/i18n-provider";
import { formatMoney } from "@/lib/payments/money";
import type { AdminSubmissionRow } from "@/lib/campaign/ugc-query";

const STATUS_CLS: Record<string, string> = {
  SUBMITTED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-primary/10 text-primary",
  REJECTED: "bg-destructive/10 text-destructive",
  REVISION_REQUESTED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};
const USAGE_CLS: Record<string, string> = {
  NOT_REQUESTED: "bg-muted text-muted-foreground",
  REQUESTED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ACCEPTED: "bg-primary/10 text-primary",
  DECLINED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground line-through",
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

// جدول إشراف تسليمات UGC + حقوق الاستخدام (admin) — على أساس الكونسول.
export function SubmissionsTable({ rows }: { rows: AdminSubmissionRow[] }) {
  const t = useMessages().admin.content;

  const columns: Column<AdminSubmissionRow>[] = [
    { key: "campaign", header: t.colCampaign, sortValue: (r) => r.campaignTitle, render: (r) => r.campaignTitle },
    { key: "brand", header: t.colBrand, sortValue: (r) => r.brandName, render: (r) => r.brandName },
    { key: "creator", header: t.colCreator, sortValue: (r) => r.creatorName, render: (r) => r.creatorName },
    { key: "type", header: t.colType, sortValue: (r) => r.typeLabel, render: (r) => r.typeLabel },
    {
      key: "status",
      header: t.colStatus,
      sortValue: (r) => r.status,
      render: (r) => <Badge label={r.statusLabel} cls={STATUS_CLS[r.status] ?? "bg-muted"} />,
    },
    {
      key: "usage",
      header: t.colUsage,
      sortValue: (r) => r.usageStatus,
      render: (r) => <Badge label={r.usageStatusLabel} cls={USAGE_CLS[r.usageStatus] ?? "bg-muted"} />,
    },
    {
      key: "fee",
      header: t.colFee,
      align: "end",
      sortValue: (r) => r.usageFee ?? 0,
      render: (r) => (r.usageFee != null ? formatMoney(r.usageFee, r.currency) : "—"),
    },
    {
      key: "net",
      header: t.colNet,
      align: "end",
      sortValue: (r) => (r.contentNet ?? 0) + (r.usageNet ?? 0),
      render: (r) => {
        const net = (r.contentNet ?? 0) + (r.usageNet ?? 0);
        return net > 0 ? formatMoney(net, r.currency) : "—";
      },
    },
    {
      key: "date",
      header: t.colDate,
      sortValue: (r) => r.createdAt,
      render: (r) => r.createdAt.slice(0, 10),
      exportValue: (r) => r.createdAt.slice(0, 10),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      searchText={(r) => `${r.campaignTitle} ${r.brandName} ${r.creatorName}`}
      csvName="ugc-submissions"
      pageSize={12}
    />
  );
}
