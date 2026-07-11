import { asRecord, str, num } from "@/lib/public/block-config";
import { safeCssUrl } from "@/lib/public/safe-url";
import { BlockShell, ComingSoonPill } from "./block-shell";

// CONSULTATION / PAID_VIDEO: عرض البطاقة والسعر فقط — لا دفع الآن (زر معطّل «قريباً»).
export function OfferBlock({
  config,
  kind,
  frosted,
}: {
  config: unknown;
  kind: "consultation" | "paid_video";
  frosted?: boolean;
}) {
  const c = asRecord(config);
  const title =
    str(c.title) || (kind === "consultation" ? "استشارة خاصّة" : "فيديو مدفوع");
  const description = str(c.description);
  const duration = str(c.duration);
  const price = num(c.price);
  const currency = str(c.currency) || "USD";
  const thumb = safeCssUrl(c.thumbnailUrl);

  const ctaLabel = kind === "consultation" ? "احجز الآن" : "شراء الفيديو";

  return (
    <BlockShell frosted={frosted}>
      <div className="flex items-start gap-3">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="size-16 shrink-0 object-cover"
            style={{ borderRadius: "calc(var(--pp-radius) * 0.5)" }}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{title}</p>
            <ComingSoonPill />
          </div>
          {description ? (
            <p className="mt-1 text-sm" style={{ opacity: 0.8 }}>
              {description}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-2 text-sm">
            {price !== null ? (
              <span className="font-bold" style={{ color: "var(--pp-accent)" }}>
                {price} {currency}
              </span>
            ) : null}
            {duration ? (
              <span style={{ opacity: 0.7 }}>· {duration}</span>
            ) : null}
          </div>
        </div>
      </div>
      <button
        type="button"
        disabled
        className="mt-3 w-full border px-4 py-2.5 text-sm font-semibold opacity-70"
        style={{
          background: "var(--pp-btn-bg)",
          color: "var(--pp-btn-text)",
          borderColor: "var(--pp-btn-border)",
          borderRadius: "var(--pp-btn-radius)",
        }}
      >
        {ctaLabel}
      </button>
    </BlockShell>
  );
}
