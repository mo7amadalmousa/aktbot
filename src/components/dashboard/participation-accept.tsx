"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

// قبول دعوة حملة → يفعّل الإسناد (participation ACTIVE). ملكية عبر الجلسة.
export function ParticipationAccept({ participationId }: { participationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const accept = async () => {
    setBusy(true);
    const res = await fetch(`/api/creator/participations/${participationId}/accept`, {
      method: "POST",
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (d.ok) router.refresh();
  };
  return (
    <button
      type="button"
      onClick={accept}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      قبول الدعوة
    </button>
  );
}
