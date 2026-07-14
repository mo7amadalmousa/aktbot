import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

// كارت إحصاء موحّد للكونسول — عنوان/قيمة/فرعيّ/أيقونة/اتجاه.
export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
  trend?: { dir: "up" | "down"; text: string };
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <div
        className={`mt-1 text-2xl font-extrabold ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 flex items-center gap-2">
        {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
        {trend ? (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              trend.dir === "up" ? "text-primary" : "text-destructive"
            }`}
          >
            {trend.dir === "up" ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {trend.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
