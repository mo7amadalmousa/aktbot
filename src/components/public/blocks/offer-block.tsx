import { asRecord, str, num } from "@/lib/public/block-config";
import { safeCssUrl } from "@/lib/public/safe-url";
import { formatMoney, toMinor } from "@/lib/payments/money";
import { BlockShell } from "./block-shell";

// CONSULTATION / PAID_VIDEO: بطاقة + سعر + زرّ شراء فعّال (على الصفحة العامّة).
// في المعاينة (interactive=false) يظهر الزرّ معطّلاً.
export function OfferBlock({
  config,
  kind,
  frosted,
  blockId,
  interactive,
}: {
  config: unknown;
  kind: "consultation" | "paid_video";
  frosted?: boolean;
  blockId?: string;
  interactive?: boolean;
}) {
  const c = asRecord(config);
  const title =
    str(c.title) || (kind === "consultation" ? "استشارة خاصّة" : "فيديو خاص");
  const description = str(c.description);
  const duration = str(c.duration);
  const price = num(c.price);
  const currency = str(c.currency) || "USD";
  const thumb = safeCssUrl(c.thumbnailUrl);
  const priceLabel =
    price !== null && price > 0 ? formatMoney(toMinor(price, currency), currency) : null;
  const ctaLabel = kind === "consultation" ? "احجز الآن" : "اطلب الآن";
  const canBuy = Boolean(interactive && blockId && price !== null && price > 0);

  const btnStyle = {
    background: "var(--pp-btn-bg)",
    color: "var(--pp-btn-text)",
    borderColor: "var(--pp-btn-border)",
    borderRadius: "var(--pp-btn-radius)",
  } as React.CSSProperties;

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
          <p className="font-semibold">{title}</p>
          {description ? (
            <p className="mt-1 text-sm" style={{ opacity: 0.8 }}>
              {description}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-2 text-sm">
            {priceLabel ? (
              <span className="font-bold" style={{ color: "var(--pp-accent)" }}>
                {priceLabel}
              </span>
            ) : null}
            {duration ? <span style={{ opacity: 0.7 }}>· {duration}</span> : null}
          </div>
        </div>
      </div>

      {canBuy ? (
        <a
          href={`/checkout/${blockId}`}
          className="mt-3 block w-full border px-4 py-2.5 text-center text-sm font-semibold transition-transform hover:-translate-y-0.5"
          style={btnStyle}
        >
          {ctaLabel}
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="mt-3 w-full border px-4 py-2.5 text-sm font-semibold opacity-70"
          style={btnStyle}
        >
          {ctaLabel}
        </button>
      )}
    </BlockShell>
  );
}
