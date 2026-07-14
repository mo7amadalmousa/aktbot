"use client";

import { useMessages } from "@/components/i18n/i18n-provider";
import { DataTable, type Column } from "@/components/console/data-table";
import { StatusBadge } from "@/components/console/status-badge";
import { formatMoney, fromMinor } from "@/lib/payments/money";
import { CAMPAIGN_STATUS_LABEL, CAMPAIGN_TYPE_LABEL } from "@/lib/attribution/labels";
import type { AdminCampaignRow } from "@/lib/attribution/query";

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "default"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  DRAFT: "muted",
  ENDED: "muted",
};

// جدول إشراف الحملات (admin) — DataTable الموحّد (فرز/بحث/ترقيم/CSV).
export function CampaignsTable({ rows }: { rows: AdminCampaignRow[] }) {
  const t = useMessages().admin.campaigns;

  const columns: Column<AdminCampaignRow>[] = [
    { key: "title", header: t.colTitle, sortValue: (r) => r.title, exportValue: (r) => r.title },
    { key: "brand", header: t.colBrand, sortValue: (r) => r.brandName, exportValue: (r) => r.brandName },
    {
      key: "type",
      header: t.colType,
      sortValue: (r) => r.type,
      exportValue: (r) => CAMPAIGN_TYPE_LABEL[r.type] ?? r.type,
      render: (r) => CAMPAIGN_TYPE_LABEL[r.type] ?? r.type,
    },
    {
      key: "status",
      header: t.colStatus,
      sortValue: (r) => r.status,
      exportValue: (r) => CAMPAIGN_STATUS_LABEL[r.status] ?? r.status,
      render: (r) => (
        <StatusBadge label={CAMPAIGN_STATUS_LABEL[r.status] ?? r.status} variant={STATUS_VARIANT[r.status] ?? "muted"} />
      ),
    },
    {
      key: "budget",
      header: t.colBudget,
      align: "end",
      sortValue: (r) => r.budgetAmount ?? -1,
      exportValue: (r) => (r.budgetAmount ? fromMinor(r.budgetAmount, r.currency) : ""),
      render: (r) => (r.budgetAmount ? formatMoney(r.budgetAmount, r.currency) : "—"),
    },
    {
      key: "spent",
      header: t.colSpent,
      align: "end",
      sortValue: (r) => r.spentAmount,
      exportValue: (r) => fromMinor(r.spentAmount, r.currency),
      render: (r) => formatMoney(r.spentAmount, r.currency),
    },
    { key: "participants", header: t.colParticipants, align: "end", sortValue: (r) => r.participants },
    {
      key: "sales",
      header: t.colSales,
      align: "end",
      sortValue: (r) => r.salesValue,
      exportValue: (r) => fromMinor(r.salesValue, r.currency),
      render: (r) => `${r.sales} · ${formatMoney(r.salesValue, r.currency)}`,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      searchText={(r) => `${r.title} ${r.brandName} ${r.type} ${r.status}`}
      pageSize={12}
      csvName="campaigns"
    />
  );
}
