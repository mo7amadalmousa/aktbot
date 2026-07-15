"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, UserPlus, Copy, Check } from "lucide-react";
import { Field, TextInput, TextArea } from "@/components/dashboard/field";
import { currencyList, minorStep } from "@/lib/payments/money";

// ── نموذج إنشاء حملة قابلة للتركيب — مكوّنات اختياريّة تُفعَّل معاً ────────
// كل مكوّن بميزانيّته (لا تسرّب). الحقول تظهر عند تفعيل المكوّن.
export function NewCampaignForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: "",
    currency: "USD",
    startAt: "",
    endAt: "",
    brief: "",
    requirements: "",
    active: true,
    // المحتوى
    contentEnabled: true,
    contentPerItem: "50",
    contentBudget: "1000",
    contentCount: "",
    // حقوق الاستخدام
    usageRightsEnabled: false,
    usageRightsBudget: "200",
    // البيع
    saleEnabled: false,
    creatorPercent: "20",
    saleBudget: "500",
    targetUrl: "",
    // الأداء
    performanceEnabled: false,
    cpc: "0.10",
    performanceBudget: "300",
  });
  const set = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (v: string) => (v ? Number(v) : undefined);

  const create = async () => {
    if (!f.title.trim()) return setError("العنوان مطلوب.");
    if (!f.contentEnabled && !f.usageRightsEnabled && !f.saleEnabled && !f.performanceEnabled) {
      return setError("فعّل مكوّناً واحداً على الأقلّ.");
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/brand/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: f.title,
        status: f.active ? "ACTIVE" : "DRAFT",
        currency: f.currency,
        startAt: f.startAt || undefined,
        endAt: f.endAt || undefined,
        brief: f.brief,
        requirements: f.requirements
          ? f.requirements.split("\n").map((s) => s.trim()).filter(Boolean)
          : [],
        // المكوّنات
        contentEnabled: f.contentEnabled,
        contentPerItem: f.contentEnabled ? num(f.contentPerItem) : undefined,
        contentBudget: f.contentEnabled ? num(f.contentBudget) : undefined,
        contentCount: f.contentEnabled ? num(f.contentCount) : undefined,
        usageRightsEnabled: f.usageRightsEnabled,
        usageRightsBudget: f.usageRightsEnabled ? num(f.usageRightsBudget) : undefined,
        saleEnabled: f.saleEnabled,
        saleCreatorBps: f.saleEnabled ? num(f.creatorPercent) : undefined,
        saleBudget: f.saleEnabled ? num(f.saleBudget) : undefined,
        targetUrl: f.saleEnabled ? f.targetUrl : undefined,
        performanceEnabled: f.performanceEnabled,
        performanceCpc: f.performanceEnabled ? num(f.cpc) : undefined,
        performanceBudget: f.performanceEnabled ? num(f.performanceBudget) : undefined,
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

  const step = minorStep(f.currency);
  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <input
        type="checkbox"
        checked={f[k as keyof typeof f] as boolean}
        onChange={(e) => set(k, e.target.checked)}
        className="size-4 accent-[var(--primary,#278A8F)]"
      />
      {label}
    </label>
  );

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4">
      <Field label="عنوان الحملة">
        <TextInput value={f.title} onChange={(v) => set("title", v)} placeholder="مثال: إطلاق الصيف" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
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
        <Field label="من (اختياريّ)">
          <input type="date" value={f.startAt} onChange={(e) => set("startAt", e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
        </Field>
        <Field label="إلى (اختياريّ)">
          <input type="date" value={f.endAt} onChange={(e) => set("endAt", e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
        </Field>
      </div>

      <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
        فعّل مكوّناً أو أكثر — كلٌّ بميزانيّته المنفصلة (لا تسرّب بينها).
      </p>

      {/* مكوّن المحتوى */}
      <div className="space-y-2 rounded-xl border border-border bg-muted/10 p-3">
        <Toggle k="contentEnabled" label="محتوى UGC (تسليم + مراجعة)" />
        {f.contentEnabled ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="أجر المحتوى المقبول">
              <TextInput type="number" step={step} value={f.contentPerItem} onChange={(v) => set("contentPerItem", v)} placeholder="50" />
            </Field>
            <Field label="ميزانية المحتوى">
              <TextInput type="number" step={step} value={f.contentBudget} onChange={(v) => set("contentBudget", v)} placeholder="1000" />
            </Field>
            <Field label="عدد المطلوب (اختياريّ)">
              <TextInput type="number" value={f.contentCount} onChange={(v) => set("contentCount", v)} placeholder="10" />
            </Field>
          </div>
        ) : null}
      </div>

      {/* مكوّن حقوق الاستخدام (يتطلّب المحتوى) */}
      <div className="space-y-2 rounded-xl border border-border bg-muted/10 p-3">
        <Toggle k="usageRightsEnabled" label="حقوق الاستخدام (أجر منفصل · قابل للتجديد)" />
        {f.usageRightsEnabled ? (
          !f.contentEnabled ? (
            <p className="text-[11px] text-destructive">تتطلّب حقوق الاستخدام تفعيل مكوّن المحتوى.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="ميزانية الحقوق">
                <TextInput type="number" step={step} value={f.usageRightsBudget} onChange={(v) => set("usageRightsBudget", v)} placeholder="200" />
              </Field>
              <p className="self-end text-[11px] text-muted-foreground">
                الأجر يُحدَّد لكل تسليم عند الطلب (≥ الحدّ الأدنى للمنصّة).
              </p>
            </div>
          )
        ) : null}
      </div>

      {/* مكوّن البيع */}
      <div className="space-y-2 rounded-xl border border-border bg-muted/10 p-3">
        <Toggle k="saleEnabled" label="عمولة بيع (إسناد عبر رابط/كود)" />
        {f.saleEnabled ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="نسبة المبدع %">
              <TextInput type="number" value={f.creatorPercent} onChange={(v) => set("creatorPercent", v)} placeholder="20" />
            </Field>
            <Field label="ميزانية البيع">
              <TextInput type="number" step={step} value={f.saleBudget} onChange={(v) => set("saleBudget", v)} placeholder="500" />
            </Field>
            <Field label="وجهة الرابط (اختياريّ)">
              <TextInput type="url" value={f.targetUrl} onChange={(v) => set("targetUrl", v)} placeholder="https://…" />
            </Field>
          </div>
        ) : null}
      </div>

      {/* مكوّن الأداء */}
      <div className="space-y-2 rounded-xl border border-border bg-muted/10 p-3">
        <Toggle k="performanceEnabled" label="أداء (CPC لكل نقرة)" />
        {f.performanceEnabled ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="سعر النقرة (CPC)">
              <TextInput type="number" step={step} value={f.cpc} onChange={(v) => set("cpc", v)} placeholder="0.10" />
            </Field>
            <Field label="ميزانية الأداء">
              <TextInput type="number" step={step} value={f.performanceBudget} onChange={(v) => set("performanceBudget", v)} placeholder="300" />
            </Field>
          </div>
        ) : null}
      </div>

      <Field label="البريف / ما تريده من المبدع">
        <TextArea value={f.brief} onChange={(v) => set("brief", v)} placeholder="صف الحملة والمطلوب…" />
      </Field>
      <Field label="الشروط (سطر لكل شرط)">
        <TextArea value={f.requirements} onChange={(v) => set("requirements", v)} placeholder={"ذكر المنتج\nهاشتاق #العلامة"} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[var(--primary,#278A8F)]" />
        {f.active ? "نشر مباشرة (نشطة)" : "حفظ كمسودّة"}
      </label>

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
