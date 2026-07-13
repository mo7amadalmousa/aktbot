"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

// إلغاء موعد من الداشبورد (ملكية المبدع). يحرّر الموعد + بريد الطرفين.
export function BookingCancel({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    if (!confirm("إلغاء هذا الموعد؟ سيُبلَّغ العميل بالبريد.")) return;
    setBusy(true);
    const res = await fetch(`/api/creator/bookings/${bookingId}/cancel`, {
      method: "POST",
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (d.ok) router.refresh();
  };

  return (
    <button
      type="button"
      onClick={cancel}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      إلغاء
    </button>
  );
}
