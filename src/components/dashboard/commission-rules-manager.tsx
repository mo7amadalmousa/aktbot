"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Power, ArrowRight } from "lucide-react";
import { Field, TextInput } from "@/components/dashboard/field";
import { formatMoney, fromMinor, DEFAULT_CURRENCY } from "@/lib/payments/money";

export interface RuleView {
  id: string;
  scope: string;
  targetId: string | null;
  saleType: string | null;
  percentBps: number | null;
  fixedAmount: number | null;
  priority: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  label: string | null;
}

const SCOPES: { key: string; label: string; rank: number }[] = [
  { key: "BY_CAMPAIGN", label: "حسب الحملة", rank: 5 },
  { key: "BY_CREATOR", label: "حسب المبدع", rank: 4 },
  { key: "BY_BRAND", label: "حسب العلامة", rank: 3 },
  { key: "BY_TYPE", label: "حسب النوع", rank: 2 },
  { key: "GLOBAL", label: "عامّ (شامل)", rank: 1 },
];
const SCOPE_LABEL = Object.fromEntries(SCOPES.map((s) => [s.key, s.label]));
const SALE_TYPES: { key: string; label: string }[] = [
  { key: "CONSULTATION", label: "استشارة" },
  { key: "VIDEO", label: "فيديو خاص" },
  { key: "STORE_DIGITAL", label: "منتج رقميّ" },
  { key: "STORE_COURSE", label: "كورس" },
  { key: "STORE_PHYSICAL", label: "منتج فيزيائيّ" },
  { key: "BOOKING", label: "حجز موعد" },
  { key: "CAMPAIGN", label: "حملة" },
  { key: "USAGE_RIGHTS", label: "حقوق استخدام" },
];
const SALE_LABEL = Object.fromEntries(SALE_TYPES.map((s) => [s.key, s.label]));

interface FormState {
  id: string | null;
  scope: string;
  saleType: string;
  targetId: string;
  rateKind: "percent" | "fixed";
  percent: string;
  fixedAmount: string;
  priority: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  label: string;
}
const empty: FormState = {
  id: null,
  scope: "GLOBAL",
  saleType: "",
  targetId: "",
  rateKind: "percent",
  percent: "10",
  fixedAmount: "",
  priority: "0",
  startAt: "",
  endAt: "",
  isActive: true,
  label: "",
};

function rateLabel(r: RuleView): string {
  if (r.fixedAmount != null) return `${formatMoney(r.fixedAmount, DEFAULT_CURRENCY)} ثابت`;
  if (r.percentBps != null) return `${(r.percentBps / 100).toFixed(2)}%`; // bps→% محايد للعملة
  return "—";
}

export function CommissionRulesManager({ initial }: { initial: RuleView[] }) {
  const router = useRouter();
  const [rules, setRules] = useState<RuleView[]>(initial);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const d = await fetch("/api/admin/commission/rules").then((r) => r.json());
    if (d.ok) setRules(d.rules as RuleView[]);
    router.refresh();
  };

  const openCreate = () => {
    setError(null);
    setForm({ ...empty });
  };
  const openEdit = (r: RuleView) => {
    setError(null);
    setForm({
      id: r.id,
      scope: r.scope,
      saleType: r.saleType ?? "",
      targetId: r.targetId ?? "",
      rateKind: r.fixedAmount != null ? "fixed" : "percent",
      percent: r.percentBps != null ? String(r.percentBps / 100) : "",
      fixedAmount: r.fixedAmount != null ? String(fromMinor(r.fixedAmount, DEFAULT_CURRENCY)) : "",
      priority: String(r.priority),
      startAt: r.startAt ? r.startAt.slice(0, 10) : "",
      endAt: r.endAt ? r.endAt.slice(0, 10) : "",
      isActive: r.isActive,
      label: r.label ?? "",
    });
  };

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setError(null);
    const payload = {
      scope: form.scope,
      saleType: form.saleType || undefined,
      targetId: form.targetId || undefined,
      percent: form.rateKind === "percent" ? Number(form.percent) : undefined,
      fixedAmount: form.rateKind === "fixed" ? Number(form.fixedAmount) : undefined,
      priority: Number(form.priority) || 0,
      startAt: form.startAt || undefined,
      endAt: form.endAt || undefined,
      isActive: form.isActive,
      label: form.label || undefined,
    };
    const res = await fetch(
      form.id ? `/api/admin/commission/rules/${form.id}` : "/api/admin/commission/rules",
      {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!d.ok) return setError(d.error || "تعذّر الحفظ.");
    setForm(null);
    await refresh();
  };

  const toggle = async (r: RuleView) => {
    await fetch(`/api/admin/commission/rules/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: r.scope,
        saleType: r.saleType || undefined,
        targetId: r.targetId || undefined,
        percent: r.percentBps != null ? r.percentBps / 100 : undefined,
        fixedAmount: r.fixedAmount != null ? fromMinor(r.fixedAmount, DEFAULT_CURRENCY) : undefined,
        priority: r.priority,
        startAt: r.startAt || undefined,
        endAt: r.endAt || undefined,
        isActive: !r.isActive,
        label: r.label || undefined,
      }),
    });
    await refresh();
  };

  const remove = async (r: RuleView) => {
    if (!confirm("حذف هذه القاعدة؟ (سجلّ العمولات المحفوظة لا يتأثّر.)")) return;
    await fetch(`/api/admin/commission/rules/${r.id}`, { method: "DELETE" });
    setRules((xs) => xs.filter((x) => x.id !== r.id));
    router.refresh();
  };

  // ── النموذج ──
  if (form) {
    const showSale = form.scope === "BY_TYPE" || form.scope !== "GLOBAL";
    const showTarget =
      form.scope === "BY_CREATOR" || form.scope === "BY_BRAND" || form.scope === "BY_CAMPAIGN";
    return (
      <div className="mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={() => setForm(null)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4" /> رجوع
        </button>
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {form.id ? "تعديل قاعدة عمولة" : "قاعدة عمولة جديدة"}
        </h2>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <Field label="النطاق">
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              {SCOPES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          {showSale ? (
            <Field
              label={
                form.scope === "BY_TYPE"
                  ? "نوع البيع (مطلوب)"
                  : "نوع البيع (فلتر اختياريّ)"
              }
            >
              <select
                value={form.saleType}
                onChange={(e) => setForm({ ...form, saleType: e.target.value })}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              >
                <option value="">— كلّ الأنواع —</option>
                {SALE_TYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {showTarget ? (
            <Field
              label={
                form.scope === "BY_CREATOR"
                  ? "معرّف المبدع (creatorProfileId)"
                  : form.scope === "BY_BRAND"
                    ? "معرّف العلامة"
                    : "معرّف الحملة"
              }
            >
              <TextInput
                value={form.targetId}
                onChange={(v) => setForm({ ...form, targetId: v })}
                placeholder="cmr…"
              />
            </Field>
          ) : null}

          <Field label="نوع النسبة">
            <div className="grid grid-cols-2 gap-2">
              {(["percent", "fixed"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, rateKind: k })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    form.rateKind === k
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {k === "percent" ? "نسبة مئويّة %" : "مبلغ ثابت"}
                </button>
              ))}
            </div>
          </Field>

          {form.rateKind === "percent" ? (
            <Field label="النسبة (%)" hint="0–100">
              <TextInput
                type="number"
                value={form.percent}
                onChange={(v) => setForm({ ...form, percent: v })}
                placeholder="10"
              />
            </Field>
          ) : (
            <Field label="المبلغ الثابت (بالوحدة الرئيسيّة)">
              <TextInput
                type="number"
                value={form.fixedAmount}
                onChange={(v) => setForm({ ...form, fixedAmount: v })}
                placeholder="5"
              />
            </Field>
          )}

          <div className="flex gap-2">
            <Field label="الأولوية" hint="كسر التعادل">
              <TextInput
                type="number"
                value={form.priority}
                onChange={(v) => setForm({ ...form, priority: v })}
                placeholder="0"
              />
            </Field>
            <Field label="من (اختياريّ)">
              <input
                type="date"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              />
            </Field>
            <Field label="إلى (اختياريّ)">
              <input
                type="date"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              />
            </Field>
          </div>

          <Field label="وصف إداريّ (اختياريّ)">
            <TextInput
              value={form.label}
              onChange={(v) => setForm({ ...form, label: v })}
              placeholder="مثال: عرض إطلاق"
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="size-4 accent-[var(--primary,#278A8F)]"
            />
            نشطة
          </label>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── القائمة (مرتّبة بالأخصّ أولاً = ترتيب الأسبقيّة) ──
  const ranked = [...rules].sort((a, b) => {
    const ra = SCOPES.find((s) => s.key === a.scope)?.rank ?? 0;
    const rb = SCOPES.find((s) => s.key === b.scope)?.rank ?? 0;
    if (rb !== ra) return rb - ra;
    return b.priority - a.priority;
  });

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">قواعد العمولة</h2>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> قاعدة جديدة
        </button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        الأسبقيّة: حملة ← مبدع ← علامة ← نوع ← عامّ. الأخصّ النشط زمنيّاً يفوز.
      </p>

      {ranked.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          لا قواعد بعد. أضِف العمولة الشاملة الافتراضية (عامّ).
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 text-start font-medium">النطاق</th>
                <th className="p-3 text-start font-medium">النوع/الهدف</th>
                <th className="p-3 text-start font-medium">النسبة</th>
                <th className="p-3 text-start font-medium">الفترة</th>
                <th className="p-3 text-start font-medium">الحالة</th>
                <th className="p-3 text-start font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium text-foreground">
                    {SCOPE_LABEL[r.scope] ?? r.scope}
                    {r.label ? (
                      <div className="text-xs text-muted-foreground">{r.label}</div>
                    ) : null}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {r.saleType ? SALE_LABEL[r.saleType] ?? r.saleType : "—"}
                    {r.targetId ? (
                      <div className="text-[10px] text-muted-foreground/70">{r.targetId.slice(0, 12)}…</div>
                    ) : null}
                  </td>
                  <td className="p-3 font-semibold text-primary">{rateLabel(r)}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {r.startAt || r.endAt
                      ? `${r.startAt?.slice(0, 10) ?? "…"} → ${r.endAt?.slice(0, 10) ?? "…"}`
                      : "دائمة"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.isActive ? "نشطة" : "معطّلة"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => toggle(r)} aria-label="تفعيل/تعطيل" className="rounded p-1.5 text-muted-foreground hover:bg-muted">
                        <Power className="size-4" />
                      </button>
                      <button type="button" onClick={() => openEdit(r)} aria-label="تعديل" className="rounded p-1.5 text-muted-foreground hover:bg-muted">
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" onClick={() => remove(r)} aria-label="حذف" className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
