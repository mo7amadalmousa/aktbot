"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Check, X, RefreshCw } from "lucide-react";
import { formatMoney } from "@/lib/payments/money";
import type {
  CreatorCampaignMeta,
  UgcSubmissionView,
  UsageRightView,
} from "@/lib/campaign/ugc-query";

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

// صندوق رفع متدفّق (تسليم/إعادة تسليم) — يرسل الملف مباشرةً (بلا FormData).
function UploadBox({ url, label, icon }: { url: string; label: string; icon: React.ReactNode }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("اختر ملفاً (فيديو أو صورة).");
    setBusy(true);
    setError(null);
    const res = await fetch(`${url}?caption=${encodeURIComponent(caption)}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!d.ok) return setError(d.error || "تعذّر الرفع.");
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background p-3">
      <input
        ref={fileRef}
        type="file"
        accept="video/*,image/*"
        className="block w-full text-xs text-muted-foreground file:me-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary"
      />
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="وصف مختصر (اختياريّ)"
        className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <button
        type="button"
        onClick={send}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : icon}
        {label}
      </button>
    </div>
  );
}

function Preview({ sub }: { sub: UgcSubmissionView }) {
  if (sub.type === "VIDEO") {
    return (
      <video
        src={sub.contentUrl}
        controls
        preload="metadata"
        className="max-h-52 w-full rounded-lg border border-border bg-black object-contain"
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={sub.contentUrl} alt={sub.caption || "محتوى"} className="max-h-52 w-full rounded-lg border border-border object-contain" />
  );
}

// بطاقة الحقّ الحاليّ — قبول/رفض شفاف (المدّة/القنوات/الأجر ظاهرة).
function UsageRightCard({ ur, isRenewal }: { ur: UsageRightView; isRenewal: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const respond = async (action: "accept" | "decline") => {
    setBusy(action);
    await fetch(`/api/creator/usage-rights/${ur.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    router.refresh();
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {isRenewal ? "تجديد حقوق الاستخدام" : "طلب حقوق استخدام"}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${UR_CLS[ur.status] ?? "bg-muted"}`}>
          {ur.statusLabel}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        الأجر: <strong className="text-foreground">{formatMoney(ur.feeAmount, ur.currency)}</strong> ·
        المدّة: {ur.durationDays} يوماً · النطاق: {ur.scopeLabel}
      </p>
      {ur.channels.length > 0 ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">القنوات: {ur.channels.join("، ")}</p>
      ) : null}
      {ur.status === "REQUESTED" ? (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => respond("accept")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy === "accept" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            قبول
          </button>
          <button
            type="button"
            onClick={() => respond("decline")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-60"
          >
            {busy === "decline" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            رفض
          </button>
        </div>
      ) : (ur.status === "ACTIVE" || ur.status === "EXPIRING_SOON") && ur.endAt ? (
        <p className="mt-1 text-[11px] text-primary">
          سارية حتى {ur.endAt.slice(0, 10)}
          {ur.status === "EXPIRING_SOON" ? " · تقترب النهاية (بانتظار تجديد العلامة)" : ""}
        </p>
      ) : null}
    </div>
  );
}

export function UgcCreatorPanel({
  campaignId,
  meta,
  submissions,
}: {
  campaignId: string;
  meta: CreatorCampaignMeta | undefined;
  submissions: UgcSubmissionView[];
}) {
  const currency = meta?.currency ?? "USD";
  const canSubmit = meta && !meta.ended;

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">محتوى (UGC)</span>
        {meta?.contentFee != null ? (
          <span className="text-muted-foreground">
            أجر المحتوى المقبول: <strong className="text-foreground">{formatMoney(meta.contentFee, currency)}</strong>
          </span>
        ) : null}
        {meta?.contentCount ? (
          <span className="text-muted-foreground">المطلوب: {meta.contentCount}</span>
        ) : null}
        {meta?.usageRightsEnabled ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-600 dark:text-amber-400">
            قد تُطلب حقوق استخدام (أجر منفصل · قابل للتجديد)
          </span>
        ) : null}
      </div>

      {meta?.brief ? <p className="text-xs text-muted-foreground">البريف: {meta.brief}</p> : null}

      {canSubmit ? (
        <UploadBox
          url={`/api/creator/campaigns/${campaignId}/submissions`}
          label="تسليم محتوى جديد"
          icon={<Upload className="size-3.5" />}
        />
      ) : (
        <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">انتهت الحملة — لا تسليم جديد.</p>
      )}

      {submissions.length > 0 ? (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="space-y-2 rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{s.typeLabel} · {s.createdAt.slice(0, 10)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLS[s.status] ?? "bg-muted"}`}>
                  {s.statusLabel}
                </span>
              </div>
              <Preview sub={s} />
              {s.caption ? <p className="text-xs text-muted-foreground">{s.caption}</p> : null}
              {s.reviewNote ? (
                <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-foreground">ملاحظة العلامة: {s.reviewNote}</p>
              ) : null}
              {s.contentPayout != null ? (
                <p className="text-xs text-primary">مستحقّ المحتوى: {formatMoney(s.contentPayout, s.currency)}</p>
              ) : null}
              {s.usageRightPayout != null ? (
                <p className="text-xs text-primary">مستحقّ الحقوق (تراكميّ): {formatMoney(s.usageRightPayout, s.currency)}</p>
              ) : null}

              {s.status === "REVISION_REQUESTED" ? (
                <UploadBox
                  url={`/api/creator/submissions/${s.id}/resubmit`}
                  label="إعادة التسليم"
                  icon={<RefreshCw className="size-3.5" />}
                />
              ) : null}

              {/* الحقّ الحاليّ (قبول/رفض) + سجلّ سلسلة التجديد */}
              {s.currentUsageRight ? (
                <UsageRightCard ur={s.currentUsageRight} isRenewal={s.currentUsageRight.isRenewal} />
              ) : null}
              {s.usageRights.length > 1 ? (
                <details className="text-[11px] text-muted-foreground">
                  <summary className="cursor-pointer">سجلّ الحقوق ({s.usageRights.length})</summary>
                  <ul className="mt-1 space-y-1">
                    {s.usageRights.slice(1).map((r) => (
                      <li key={r.id}>
                        {r.statusLabel} · {formatMoney(r.feeAmount, r.currency)} · {r.durationDays} يوماً
                        {r.endAt ? ` · حتى ${r.endAt.slice(0, 10)}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-[11px] text-muted-foreground">لا تسليمات بعد — سلّم محتواك الأوّل.</p>
      )}
    </div>
  );
}
