"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { useMessages } from "@/components/i18n/i18n-provider";
import { currencyList, fromMinor } from "@/lib/payments/money";

// ضبط الحدّ الأدنى لأجر حقوق الاستخدام per-currency (يُخزَّن minor · يُدخَل major).
export function UsageFeeSettings({
  fees,
  defaults,
}: {
  fees: Record<string, number>; // minor مُخزَّن
  defaults: Record<string, number>; // minor افتراضيّ
}) {
  const t = useMessages().admin.content;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of currencyList()) {
      init[c.code] = fees[c.code] != null ? String(fromMinor(fees[c.code], c.code)) : "";
    }
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    const payload: Record<string, number> = {};
    for (const [code, v] of Object.entries(values)) {
      if (v.trim() !== "" && Number(v) >= 0) payload[code] = Number(v);
    }
    const res = await fetch("/api/admin/settings/usage-fee", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fees: payload }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{t.minFeeTitle}</p>
      <p className="mb-3 text-xs text-muted-foreground">{t.minFeeDesc}</p>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {currencyList().map((c) => (
          <label key={c.code} className="text-xs text-foreground">
            {c.code} · {c.symbol}
            <input
              type="number"
              min={0}
              value={values[c.code] ?? ""}
              onChange={(e) => setValues((s) => ({ ...s, [c.code]: e.target.value }))}
              placeholder={`${t.defaultHint}: ${fromMinor(defaults[c.code] ?? 0, c.code)}`}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} {t.save}
        </button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <Check className="size-4" /> {t.saved}
          </span>
        ) : null}
      </div>
    </div>
  );
}
