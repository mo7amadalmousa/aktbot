"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Download,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useMessages } from "@/components/i18n/i18n-provider";
import { EmptyState } from "./empty-state";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode; // عرض مخصّص
  sortValue?: (row: T) => string | number; // للفرز
  exportValue?: (row: T) => string | number; // لتصدير CSV
  align?: "start" | "end";
}

// جدول بيانات موحّد: فرز · بحث · ترقيم صفحات (offset) · حالة فارغة · تصدير CSV.
// كلّ العمليات client-side (مناسب لصفحات الأدمن؛ للأحجام الضخمة يُمرَّر page-fetch لاحقاً).
export function DataTable<T>({
  columns,
  rows,
  searchText,
  pageSize = 10,
  csvName,
  emptyTitle,
  emptyDesc,
}: {
  columns: Column<T>[];
  rows: T[];
  searchText?: (row: T) => string; // نصّ البحث لكل صفّ
  pageSize?: number;
  csvName?: string; // إن مُرِّر → زرّ تصدير CSV
  emptyTitle?: string;
  emptyDesc?: string;
}) {
  const t = useMessages().admin.table;
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q && searchText) out = rows.filter((r) => searchText(r).toLowerCase().includes(q));
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av < bv) return sortDir === "asc" ? -1 : 1;
          if (av > bv) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }
    return out;
  }, [rows, query, sortKey, sortDir, columns, searchText]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  const toggleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortValue) return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const exportCsv = () => {
    const cols = columns.filter((c) => c.exportValue || c.sortValue);
    const head = cols.map((c) => c.header);
    const lines = filtered.map((r) =>
      cols
        .map((c) => {
          const v = c.exportValue ? c.exportValue(r) : c.sortValue ? c.sortValue(r) : "";
          const s = String(v).replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        })
        .join(","),
    );
    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvName || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full">
      {(searchText || csvName) ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {searchText ? (
            <div className="relative flex-1 min-w-40">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={t.search}
                className="h-9 w-full rounded-lg border border-input bg-background ps-9 pe-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          ) : null}
          {csvName ? (
            <button
              type="button"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              <Download className="size-4" /> {t.export}
            </button>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle || t.empty} description={emptyDesc || t.emptyDesc} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={`p-3 font-medium ${c.align === "end" ? "text-end" : "text-start"}`}
                    >
                      {c.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {c.header}
                          {sortKey === c.key ? (
                            sortDir === "asc" ? (
                              <ChevronUp className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`p-3 ${c.align === "end" ? "text-end" : "text-start"} text-foreground`}
                      >
                        {c.render ? c.render(row) : c.sortValue ? String(c.sortValue(row)) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 ? (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {t.page} {clampedPage + 1} {t.of} {pageCount}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={clampedPage === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="size-4 rtl:hidden" />
                  <ChevronLeft className="size-4 ltr:hidden" />
                  {t.prev}
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={clampedPage >= pageCount - 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
                >
                  {t.next}
                  <ChevronLeft className="size-4 rtl:hidden" />
                  <ChevronRight className="size-4 ltr:hidden" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
