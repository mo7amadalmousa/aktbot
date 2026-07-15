"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, Pencil, Download, Lock, ShieldCheck } from "lucide-react";
import { formatMoney, fromMinor, minorStep } from "@/lib/payments/money";
import { USAGE_CHANNELS } from "@/lib/campaign/labels";
import type { BrandSubmissionView } from "@/lib/campaign/ugc-query";

const STATUS_CLS: Record<string, string> = {
  SUBMITTED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-primary/10 text-primary",
  REJECTED: "bg-destructive/10 text-destructive",
  REVISION_REQUESTED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};
const UR_CLS: Record<string, string> = {
  REQUESTED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ACCEPTED: "bg-primary/10 text-primary",
  DECLINED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground line-through",
};

function Preview({ sub }: { sub: BrandSubmissionView }) {
  if (sub.type === "VIDEO") {
    return (
      <video
        src={sub.contentUrl}
        controls
        preload="metadata"
        className="max-h-56 w-full rounded-lg border border-border bg-black object-contain"
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={sub.contentUrl}
      alt={sub.caption || "محتوى"}
      className="max-h-56 w-full rounded-lg border border-border object-contain"
    />
  );
}

// مراجعة: قبول/رفض/طلب تعديل + ملاحظة.
function ReviewActions({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const review = async (action: "APPROVE" | "REJECT" | "REVISION") => {
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/brand/submissions/${submissionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(null);
    if (!d.ok) return setError(d.error || "تعذّر الإجراء.");
    router.refresh();
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background p-3">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="ملاحظة للمبدع (اختياريّة)"
        className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => review("APPROVE")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy === "APPROVE" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          قبول (يُنشئ المستحقّ)
        </button>
        <button
          type="button"
          onClick={() => review("REVISION")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted disabled:opacity-60"
        >
          {busy === "REVISION" ? <Loader2 className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}
          طلب تعديل
        </button>
        <button
          type="button"
          onClick={() => review("REJECT")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5 disabled:opacity-60"
        >
          {busy === "REJECT" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
          رفض
        </button>
      </div>
    </div>
  );
}

// طلب حقوق استخدام — الأجر ≥ الحدّ الأدنى (تحقّق خادميّ 422).
function RequestRightsForm({
  submissionId,
  currency,
  minFee,
}: {
  submissionId: string;
  currency: string;
  minFee: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState(String(fromMinor(minFee, currency)));
  const [durationDays, setDurationDays] = useState("90");
  const [scope, setScope] = useState("ORGANIC");
  const [channels, setChannels] = useState<Record<string, boolean>>({ meta: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (k: string) => setChannels((s) => ({ ...s, [k]: !s[k] }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/brand/submissions/${submissionId}/usage-rights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fee: Number(fee),
        durationDays: Number(durationDays),
        scope,
        channels,
      }),
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!d.ok) return setError(d.error || "تعذّر الطلب.");
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
      >
        <ShieldCheck className="size-3.5" /> طلب حقوق استخدام
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="text-[11px] text-muted-foreground">
        الحدّ الأدنى للمنصّة: <strong className="text-foreground">{formatMoney(minFee, currency)}</strong>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-foreground">
          الأجر ({currency})
          <input
            type="number"
            step={minorStep(currency)}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-foreground">
          المدّة (أيّام)
          <input
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
          />
        </label>
      </div>
      <label className="block text-xs text-foreground">
        النطاق
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
        >
          <option value="ORGANIC">عضويّ</option>
          <option value="PAID">إعلان مدفوع</option>
          <option value="WHITELISTING">Whitelisting / Spark Ads</option>
        </select>
      </label>
      <div>
        <p className="mb-1 text-xs text-foreground">القنوات</p>
        <div className="flex flex-wrap gap-2">
          {USAGE_CHANNELS.map((c) => (
            <label
              key={c.key}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-foreground"
            >
              <input
                type="checkbox"
                checked={!!channels[c.key]}
                onChange={() => toggle(c.key)}
                className="size-3.5 accent-[var(--primary,#278A8F)]"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>
      {scope === "WHITELISTING" ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Whitelisting/Spark Ads: يُسجَّل النطاق الآن؛ التنفيذ الفعليّ مع المنصّات لاحقاً.
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null} إرسال الطلب
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-border px-4 py-1.5 text-xs text-foreground hover:bg-muted"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

export function UgcBrandPanel({
  submissions,
  currency,
  minFee,
}: {
  submissions: BrandSubmissionView[];
  currency: string;
  minFee: number;
}) {
  if (submissions.length === 0) {
    return (
      <p className="mt-2 rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
        لا تسليمات محتوى بعد. حين يسلّم المبدعون، تظهر هنا للمراجعة.
      </p>
    );
  }
  return (
    <div className="mt-3 space-y-3">
      {submissions.map((s) => (
        <div key={s.id} className="space-y-2 rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">
              {s.creatorName} <span className="text-muted-foreground">/{s.username}</span> · {s.typeLabel}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLS[s.status] ?? "bg-muted"}`}>
              {s.statusLabel}
            </span>
          </div>

          <Preview sub={s} />
          {s.caption ? <p className="text-xs text-muted-foreground">{s.caption}</p> : null}
          {s.reviewNote ? (
            <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-foreground">ملاحظتك: {s.reviewNote}</p>
          ) : null}
          {s.contentPayout != null ? (
            <p className="text-xs text-primary">مستحقّ المحتوى للمبدع: {formatMoney(s.contentPayout, s.currency)}</p>
          ) : null}

          {/* مراجعة (للمعلّق فقط) */}
          {s.status === "SUBMITTED" ? <ReviewActions submissionId={s.id} /> : null}

          {/* حقوق الاستخدام (للمقبول) */}
          {s.status === "APPROVED" ? (
            <div className="space-y-2">
              {s.usageRight ? (
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-foreground">حقوق الاستخدام</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${UR_CLS[s.usageRight.status] ?? "bg-muted"}`}>
                      {s.usageRight.statusLabel}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    الأجر: <strong className="text-foreground">{formatMoney(s.usageRight.feeAmount, s.usageRight.currency)}</strong> ·
                    المدّة: {s.usageRight.durationDays} يوماً · النطاق: {s.usageRight.scopeLabel}
                  </p>
                  {s.usageRight.channels.length > 0 ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">القنوات: {s.usageRight.channels.join("، ")}</p>
                  ) : null}
                  {s.usageRight.status === "ACCEPTED" && s.usageRight.endAt ? (
                    <p className="mt-1 text-[11px] text-primary">سارية حتى {s.usageRight.endAt.slice(0, 10)}</p>
                  ) : null}
                  {s.usageRightPayout != null ? (
                    <p className="mt-0.5 text-[11px] text-primary">مستحقّ الحقوق للمبدع: {formatMoney(s.usageRightPayout, s.currency)}</p>
                  ) : null}
                  {/* إعادة الطلب متاحة إن رُفض/انتهى */}
                  {(s.usageRight.status === "DECLINED" || s.usageRight.status === "EXPIRED") ? (
                    <div className="mt-2">
                      <RequestRightsForm submissionId={s.id} currency={currency} minFee={minFee} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <RequestRightsForm submissionId={s.id} currency={currency} minFee={minFee} />
              )}

              {/* التنزيل مشروط بحقوق مقبولة سارية */}
              {s.canDownload ? (
                <a
                  href={s.downloadUrl}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                >
                  <Download className="size-3.5" /> تنزيل المحتوى
                </a>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3.5" /> التنزيل بعد قبول الحقوق
                </span>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
