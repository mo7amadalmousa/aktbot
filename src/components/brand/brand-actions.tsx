"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, UserPlus, Copy, Check } from "lucide-react";
import { TextInput } from "@/components/dashboard/field";

// إنشاء حملة جديدة (هيكل أساسيّ).
export function NewCampaignForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("SALE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!title.trim()) return setError("العنوان مطلوب.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/brand/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, status: "ACTIVE" }),
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!d.ok) return setError(d.error || "تعذّر الإنشاء.");
    setTitle("");
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="size-4" /> حملة جديدة
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
      <TextInput value={title} onChange={setTitle} placeholder="عنوان الحملة" />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
      >
        <option value="SALE">مبيعات</option>
        <option value="PERFORMANCE">أداء</option>
        <option value="UGC">محتوى (UGC)</option>
      </select>
      <button type="button" onClick={create} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} إنشاء
      </button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
        إلغاء
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

// تغيير حالة الحملة (تفعيل الإسناد عند ACTIVE).
export function CampaignStatusSelect({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const change = async (next: string) => {
    setBusy(true);
    await fetch(`/api/brand/campaigns/${campaignId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  };
  return (
    <select
      value={status}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
    >
      <option value="DRAFT">مسودّة</option>
      <option value="ACTIVE">نشطة</option>
      <option value="PAUSED">موقوفة</option>
      <option value="ENDED">منتهية</option>
    </select>
  );
}

// إضافة مبدع للحملة (username) → يولّد كوداً/رابطاً فريدين.
export function AddCreatorForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; link: string } | null>(null);

  const add = async () => {
    if (!username.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/brand/campaigns/${campaignId}/participations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!d.ok) return setError(d.error || "تعذّر الإضافة.");
    setResult({ code: d.code, link: d.link });
    setUsername("");
    router.refresh();
  };

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput value={username} onChange={setUsername} placeholder="username المبدع" />
        <button type="button" onClick={add} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />} إضافة مبدع
        </button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
      {result ? (
        <p className="mt-1 text-xs text-primary">
          أُضيف — الكود <strong>{result.code}</strong> · الرابط {result.link}
        </p>
      ) : null}
    </div>
  );
}

// نسخ الرابط/الكود.
export function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* تجاهُل */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
    >
      {done ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
      {label}
    </button>
  );
}
