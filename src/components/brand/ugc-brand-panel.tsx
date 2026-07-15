"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, Pencil, Download, Lock, ShieldCheck, RefreshCw, TrendingUp } from "lucide-react";
import { formatMoney, fromMinor, minorStep } from "@/lib/payments/money";
import { USAGE_CHANNELS } from "@/lib/campaign/labels";
import type { BrandSubmissionView, UsageRightView } from "@/lib/campaign/ugc-query";

const STATUS_CLS: Record<string, string> = {
  SUBMITTED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-primary/10 text-primary",
  AUTO_APPROVED: "bg-primary/10 text-primary",
  REJECTED: "bg-destructive/10 text-destructive",
  REVISION_REQUESTED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};
const UR_CLS: Record<string, string> = {
  REQUESTED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ACTIVE: "bg-primary/10 text-primary",
  ACCEPTED: "bg-primary/10 text-primary",
  EXPIRING_SOON: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  DECLINED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground line-through",
};

function Preview({ sub }: { sub: BrandSubmissionView }) {
  if (sub.type === "VIDEO") {
    return (
      <video src={sub.contentUrl} controls preload="metadata" className="max-h-56 w-full rounded-lg border border-border bg-black object-contain" />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={sub.contentUrl} alt={sub.caption || "محتوى"} className="max-h-56 w-full rounded-lg border border-border object-contain" />;
}

// مراجعة: قبول/تعديل(مرّة، ملاحظة إلزاميّة)/رفض(سبب إلزاميّ).
function ReviewActions({ submissionId, revisionCount }: { submissionId: string; revisionCount: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canRevise = revisionCount < 1;

  const review = async (action: "APPROVE" | "REJECT" | "REVISION") => {
    if ((action === "REVISION" || action === "REJECT") && !note.trim()) {
      return setError(action === "REVISION" ? "ملاحظة التعديل إلزاميّة." : "سبب الرفض إلزاميّ.");
    }
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
        placeholder="ملاحظة/سبب (إلزاميّ للتعديل والرفض)"
        className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => review("APPROVE")} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {busy === "APPROVE" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          قبول (يُنشئ المستحقّ)
        </button>
        <button type="button" onClick={() => review("REVISION")} disabled={busy !== null || !canRevise} title={canRevise ? "" : "استُنفد طلب التعديل"} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted disabled:opacity-40">
          {busy === "REVISION" ? <Loader2 className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}
          طلب تعديل{canRevise ? "" : " (مُستنفد)"}
        </button>
        <button type="button" onClick={() => review("REJECT")} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5 disabled:opacity-60">
          {busy === "REJECT" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
          رفض
        </button>
      </div>
    </div>
  );
}

// طلب/تجديد حقوق — الأجر ≥ الحدّ الأدنى (تحقّق خادميّ 422).
function RequestRightsForm({
  submissionId,
  currency,
  minFee,
  isRenewal,
}: {
  submissionId: string;
  currency: string;
  minFee: number;
  isRenewal: boolean;
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
      body: JSON.stringify({ fee: Number(fee), durationDays: Number(durationDays), scope, channels }),
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!d.ok) return setError(d.error || "تعذّر الطلب.");
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5">
        {isRenewal ? <RefreshCw className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
        {isRenewal ? "تجديد الحقوق (أجر جديد)" : "طلب حقوق استخدام"}
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
          <input type="number" step={minorStep(currency)} value={fee} onChange={(e) => setFee(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
        </label>
        <label className="text-xs text-foreground">
          المدّة (أيّام)
          <input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
        </label>
      </div>
      <label className="block text-xs text-foreground">
        النطاق
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground">
          <option value="ORGANIC">عضويّ</option>
          <option value="PAID">إعلان مدفوع</option>
          <option value="WHITELISTING">Whitelisting / Spark Ads</option>
        </select>
      </label>
      <div>
        <p className="mb-1 text-xs text-foreground">القنوات</p>
        <div className="flex flex-wrap gap-2">
          {USAGE_CHANNELS.map((c) => (
            <label key={c.key} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-foreground">
              <input type="checkbox" checked={!!channels[c.key]} onChange={() => toggle(c.key)} className="size-3.5 accent-[var(--primary,#278A8F)]" />
              {c.label}
            </label>
          ))}
        </div>
      </div>
      {scope === "WHITELISTING" ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">Whitelisting/Spark Ads: يُسجَّل النطاق الآن؛ التنفيذ مع المنصّات لاحقاً.</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null} إرسال
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-1.5 text-xs text-foreground hover:bg-muted">إلغاء</button>
      </div>
    </div>
  );
}

function UsageRightBox({ ur, payout, currency }: { ur: UsageRightView; payout: number | null; currency: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-foreground">حقوق الاستخدام{ur.isRenewal ? " (تجديد)" : ""}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${UR_CLS[ur.status] ?? "bg-muted"}`}>{ur.statusLabel}</span>
      </div>
      <p className="text-muted-foreground">
        الأجر: <strong className="text-foreground">{formatMoney(ur.feeAmount, ur.currency)}</strong> · المدّة: {ur.durationDays} يوماً · النطاق: {ur.scopeLabel}
      </p>
      {ur.channels.length > 0 ? <p className="mt-0.5 text-[11px] text-muted-foreground">القنوات: {ur.channels.join("، ")}</p> : null}
      {(ur.status === "ACTIVE" || ur.status === "EXPIRING_SOON") && ur.endAt ? (
        <p className="mt-1 text-[11px] text-primary">سارية حتى {ur.endAt.slice(0, 10)}{ur.status === "EXPIRING_SOON" ? " · قربت النهاية — جدّد قبل الانتهاء" : ""}</p>
      ) : null}
      {payout != null ? <p className="mt-0.5 text-[11px] text-primary">مستحقّ الحقوق للمبدع (تراكميّ): {formatMoney(payout, currency)}</p> : null}
    </div>
  );
}

export function UgcBrandPanel({ submissions, currency, minFee }: { submissions: BrandSubmissionView[]; currency: string; minFee: number }) {
  if (submissions.length === 0) {
    return (
      <p className="mt-2 rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
        لا تسليمات محتوى بعد. حين يسلّم المبدعون، تظهر هنا للمراجعة.
      </p>
    );
  }
  return (
    <div className="mt-3 space-y-3">
      {submissions.map((s) => {
        const cur = s.currentUsageRight;
        const approved = s.status === "APPROVED" || s.status === "AUTO_APPROVED";
        // زرّ التجديد يظهر حين لا يوجد طلب معلّق (الحقّ الأحدث ليس REQUESTED).
        const canRequestOrRenew = approved && (!cur || cur.status !== "REQUESTED");
        const isRenewal = Boolean(cur && cur.status !== "REQUESTED");
        return (
          <div key={s.id} className="space-y-2 rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {s.creatorName} <span className="text-muted-foreground">/{s.username}</span> · {s.typeLabel}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLS[s.status] ?? "bg-muted"}`}>{s.statusLabel}</span>
            </div>

            <Preview sub={s} />
            {s.caption ? <p className="text-xs text-muted-foreground">{s.caption}</p> : null}

            {/* أداء المحتوى (الإسناد) — «هذا المبدع جلب X» → قرار التجديد مبنيّ على بيانات */}
            {(s.perfSales > 0 || s.perfSalesValue > 0) ? (
              <p className="inline-flex items-center gap-1 rounded-lg bg-primary/5 px-2 py-1 text-[11px] text-primary">
                <TrendingUp className="size-3.5" /> أداء المبدع في الحملة: {s.perfSales} بيع · {formatMoney(s.perfSalesValue, s.currency)}
              </p>
            ) : null}

            {s.reviewNote ? <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-foreground">ملاحظتك: {s.reviewNote}</p> : null}
            {s.contentPayout != null ? <p className="text-xs text-primary">مستحقّ المحتوى للمبدع: {formatMoney(s.contentPayout, s.currency)}</p> : null}

            {s.status === "SUBMITTED" ? <ReviewActions submissionId={s.id} revisionCount={s.revisionCount} /> : null}

            {approved ? (
              <div className="space-y-2">
                {cur ? <UsageRightBox ur={cur} payout={s.usageRightPayout} currency={s.currency} /> : null}
                {canRequestOrRenew ? (
                  <RequestRightsForm submissionId={s.id} currency={currency} minFee={minFee} isRenewal={isRenewal} />
                ) : null}

                {s.canDownload ? (
                  <a href={s.downloadUrl} className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5">
                    <Download className="size-3.5" /> تنزيل المحتوى
                  </a>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
                    <Lock className="size-3.5" /> التنزيل بحقوق سارية فقط
                  </span>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
