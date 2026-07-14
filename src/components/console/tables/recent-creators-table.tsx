"use client";

import Link from "next/link";
import { useMessages } from "@/components/i18n/i18n-provider";
import { DataTable, type Column } from "@/components/console/data-table";
import { StatusBadge } from "@/components/console/status-badge";

export interface CreatorRow {
  id: string;
  displayName: string;
  username: string;
  isPublished: boolean;
  createdAt: string; // ISO
}

// جدول «أحدث المبدعين» — يستخدم DataTable الموحّد (فرز/بحث/ترقيم/CSV/حالة فارغة).
export function RecentCreatorsTable({ rows }: { rows: CreatorRow[] }) {
  const t = useMessages().admin.overview;

  const columns: Column<CreatorRow>[] = [
    {
      key: "creator",
      header: t.colCreator,
      sortValue: (r) => r.displayName,
      exportValue: (r) => `${r.displayName} (@${r.username})`,
      render: (r) => (
        <Link href={`/u/${r.username}`} className="text-foreground hover:text-primary">
          {r.displayName}
          <span className="ms-1 text-xs text-muted-foreground">/{r.username}</span>
        </Link>
      ),
    },
    {
      key: "status",
      header: t.colStatus,
      sortValue: (r) => (r.isPublished ? 1 : 0),
      exportValue: (r) => (r.isPublished ? t.statusPublished : t.statusDraft),
      render: (r) => (
        <StatusBadge
          label={r.isPublished ? t.statusPublished : t.statusDraft}
          variant={r.isPublished ? "success" : "muted"}
        />
      ),
    },
    {
      key: "date",
      header: t.colDate,
      align: "end",
      sortValue: (r) => r.createdAt,
      exportValue: (r) => r.createdAt.slice(0, 10),
      render: (r) => (
        <span className="text-muted-foreground">{r.createdAt.slice(0, 10)}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      searchText={(r) => `${r.displayName} ${r.username}`}
      pageSize={8}
      csvName="creators"
    />
  );
}
