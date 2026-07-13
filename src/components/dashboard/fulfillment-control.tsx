"use client";

import { useState } from "react";
import { Loader2, Truck } from "lucide-react";

const STATUSES: { key: string; label: string }[] = [
  { key: "PENDING", label: "بانتظار التجهيز" },
  { key: "PROCESSING", label: "قيد التجهيز" },
  { key: "SHIPPED", label: "تم الشحن" },
  { key: "DELIVERED", label: "تم التسليم" },
  { key: "CANCELLED", label: "أُلغي" },
];

// تحكّم المبدع بحالة تنفيذ طلب فيزيائيّ (+ رقم تتبّع). بريد المشتري يُرسَل خادميّاً عند الشحن.
export function FulfillmentControl({
  orderId,
  initialStatus,
  initialTracking,
}: {
  orderId: string;
  initialStatus: string;
  initialTracking: string | null;
}) {
  const [status, setStatus] = useState(initialStatus || "PENDING");
  const [tracking, setTracking] = useState(initialTracking ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/creator/orders/${orderId}/fulfillment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, trackingNumber: tracking }),
      });
      const d = await res.json();
      if (!d.ok) setError(d.error || "تعذّر الحفظ.");
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError("تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
      >
        {STATUSES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <input
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        placeholder="رقم التتبّع"
        className="h-8 w-28 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Truck className="size-3.5" />}
        {saved ? "حُفظ" : "حفظ"}
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
