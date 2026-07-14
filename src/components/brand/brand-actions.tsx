"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, UserPlus, Copy, Check } from "lucide-react";
import { Field, TextInput, TextArea } from "@/components/dashboard/field";
import { currencyList, minorStep } from "@/lib/payments/money";

const TYPE_HINT: Record<string, string> = {
  SALE: "المبدع يكسب نسبة/مبلغاً من كل بيعة عبر رابطه.",
  PERFORMANCE: "المبدع يكسب مبلغاً لكل نقرة (CPC).",
  UGC: "المبدع يكسب مبلغاً لكل محتوى مقبول (القبول لاحقاً).",
};

// نموذج إنشاء حملة كامل — النوع + الميزانية + المدّة + الشروط + إعداد الدفع.
export function NewCampaignForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: "",
    type: "SALE",
    currency: "USD",
    budget: "",
    startAt: "",
    endAt: "",
    brief: "",
    targetUrl: "",
    requirements: "",
    // الدفع حسب النوع
    creatorPercent: "20", // SALE (نسبة المبدع %)
    cpc: "0.10", // PERFORMANCE (لكل نقرة)
    fixedPerContent: "10", // UGC
    active: true,
  });
  const set = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!f.title.trim()) return setError("العنوان مطلوب.");
    setBusy(true);
    setError(null);
    const payout: Record<string, number> =
      f.type === "SALE"
        ? { creatorBps: Math.round(Number(f.creatorPercent) * 100) }
        : f.type === "PERFORMANCE"
          ? { cpc: Number(f.cpc) }
          : { fixedPerContent: Number(f.fixedPerContent) };
    const res = await fetch("/api/brand/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: f.title,
        type: f.type,
        status: f.active ? "ACTIVE" : "DRAFT",
        currency: f.currency,
        budget: f.budget ? Number(f.budget) : undefined,
        startAt: f.startAt || undefined,
        endAt: f.endAt || undefined,
        brief: f.brief,
        targetUrl: f.type === "SALE" ? f.targetUrl : undefined,
        requirements: f.requirements
          ? f.requirements.split("\n").map((s) => s.trim()).filter(Boolean)
          : [],
        ...payout,
      }),
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!d.ok) return setError(d.error || "تعذّر الإنشاء.");
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
    <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4">
      <Field label="عنوان الحملة">
        <TextInput value={f.title} onChange={(v) => set("title", v)} placeholder="مثال: إطلاق الصيف" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="النوع">
          <select
            value={f.type}
            onChange={(e) => set("type", e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
          >
            <option value="SALE">مبيعات (SALE)</option>
            <option value="PERFORMANCE">أداء (PERFORMANCE)</option>
            <option value="UGC">محتوى (UGC)</option>
          </select>
        </Field>
        <Field label="العملة">
          <select
            value={f.currency}
            onChange={(e) => set("currency", e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
          >
            {currencyList().map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.symbol}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">{TYPE_HINT[f.type]}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="الميزانية">
          <TextInput type="number" step={minorStep(f.currency)} value={f.budget} onChange={(v) => set("budget", v)} placeholder="500" />
        </Field>
        {f.type === "SALE" ? (
          <Field label="نسبة المبدع %">
            <TextInput type="number" value={f.creatorPercent} onChange={(v) => set("creatorPercent", v)} placeholder="20" />
          </Field>
        ) : f.type === "PERFORMANCE" ? (
          <Field label="سعر النقرة (CPC)">
            <TextInput type="number" step={minorStep(f.currency)} value={f.cpc} onChange={(v) => set("cpc", v)} placeholder="0.10" />
          </Field>
        ) : (
          <Field label="لكل محتوى مقبول">
            <TextInput type="number" step={minorStep(f.currency)} value={f.fixedPerContent} onChange={(v) => set("fixedPerContent", v)} placeholder="10" />
          </Field>
        )}
        <Field label="نشر مباشرة؟">
          <label className="flex h-9 items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[var(--primary,#278A8F)]" />
            {f.active ? "نشطة" : "مسودّة"}
          </label>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="من (اختياريّ)">
          <input type="date" value={f.startAt} onChange={(e) => set("startAt", e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
        </Field>
        <Field label="إلى (اختياريّ)">
          <input type="date" value={f.endAt} onChange={(e) => set("endAt", e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
        </Field>
      </div>

      {f.type === "SALE" ? (
        <Field label="وجهة الرابط (اختياريّ)">
          <TextInput type="url" value={f.targetUrl} onChange={(v) => set("targetUrl", v)} placeholder="https://…" />
        </Field>
      ) : null}

      <Field label="البريف / ما تريده من المبدع">
        <TextArea value={f.brief} onChange={(v) => set("brief", v)} placeholder="صف الحملة والمطلوب…" />
      </Field>
      <Field label="الشروط (سطر لكل شرط)">
        <TextArea value={f.requirements} onChange={(v) => set("requirements", v)} placeholder={"ذكر المنتج\nهاشتاق #العلامة"} />
      </Field>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      ) : null}
      <div className="flex gap-2">
        <button type="button" onClick={create} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} إنشاء الحملة
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:bg-muted">
          إلغاء
        </button>
      </div>
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
