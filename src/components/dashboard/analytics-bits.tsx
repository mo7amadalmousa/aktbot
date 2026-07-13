import type { ReactNode } from "react";
import type { DayPoint } from "@/lib/analytics/query";

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

// بطاقة إحصاء.
export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
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
      <div className={`mt-1 text-2xl font-extrabold ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

// رسم أعمدة بسيط (خادميّ — بلا JS). الطول نسبةً لأعلى قيمة.
export function MiniBars({
  series,
  label = "زيارات",
}: {
  series: DayPoint[];
  label?: string;
}) {
  const max = Math.max(1, ...series.map((p) => p.views));
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">
        {label} — آخر {series.length} يوماً
      </p>
      <div className="flex h-32 items-end gap-0.5">
        {series.map((p) => (
          <div
            key={p.date}
            className="group relative flex-1"
            title={`${p.date}: ${p.views} زيارة · ${p.uniques} فريد`}
          >
            <div
              className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
              style={{ height: `${Math.max(2, (p.views / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{series[0]?.date.slice(5)}</span>
        <span>{series[series.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

// شريط مصادر الزيارة (direct/social/other).
export function SourceBar({
  sources,
}: {
  sources: { direct: number; social: number; other: number };
}) {
  const total = sources.direct + sources.social + sources.other;
  const seg = [
    { key: "مباشر", val: sources.direct, cls: "bg-primary" },
    { key: "سوشيال", val: sources.social, cls: "bg-teal-400" },
    { key: "أخرى", val: sources.other, cls: "bg-muted-foreground/40" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">مصادر الزيارة</p>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground">لا بيانات بعد.</p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {seg.map((s) =>
              s.val > 0 ? (
                <div
                  key={s.key}
                  className={s.cls}
                  style={{ width: `${(s.val / total) * 100}%` }}
                  title={`${s.key}: ${s.val}`}
                />
              ) : null,
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {seg.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1">
                <span className={`inline-block size-2 rounded-full ${s.cls}`} />
                {s.key} {total ? Math.round((s.val / total) * 100) : 0}%
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
