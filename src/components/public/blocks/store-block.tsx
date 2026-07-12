import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { safeHref, safeCssUrl } from "@/lib/public/safe-url";
import { formatMoney, toMinor } from "@/lib/payments/money";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { BlockShell } from "./block-shell";
import { ImageIcon } from "lucide-react";

// STORE: شبكة منتجات بروابط شراء خارجيّة (rel آمن). تمهيد للأفلييت لاحقاً.
export function StoreBlock({
  config,
  frosted,
}: {
  config: unknown;
  frosted?: boolean;
}) {
  const c = asRecord(config);
  const title = str(c.title);
  const products = arr(c.products)
    .map((p) => {
      const r = asRecord(p);
      return {
        imageUrl: safeCssUrl(r.imageUrl),
        title: str(r.title),
        href: safeHref(r.url),
        price: num(r.price),
        currency: str(r.currency) || "USD",
      };
    })
    .slice(0, 30);

  if (products.length === 0) {
    return (
      <BlockShell frosted={frosted}>
        <p className="text-center text-sm" style={{ opacity: 0.8 }}>
          {title || "المتجر"} — أضِف منتجات.
        </p>
      </BlockShell>
    );
  }

  return (
    <BlockShell frosted={frosted}>
      {title ? <p className="mb-3 text-sm font-semibold">{title}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        {products.map((p, i) => {
          const priceLabel =
            p.price !== null && p.price > 0
              ? formatMoney(toMinor(p.price, p.currency), p.currency)
              : null;
          const inner = (
            <>
              <div
                className="mb-2 aspect-square w-full overflow-hidden"
                style={{ borderRadius: "calc(var(--pp-radius) * 0.5)" }}
              >
                {p.imageUrl ? (
                  <ResponsiveImage
                    url={p.imageUrl}
                    variant="gallery"
                    alt={p.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div
                    className="flex size-full items-center justify-center"
                    style={{ background: "color-mix(in oklab, var(--pp-text) 8%, transparent)" }}
                  >
                    <ImageIcon className="size-6" style={{ opacity: 0.5 }} />
                  </div>
                )}
              </div>
              <p className="line-clamp-2 text-sm font-medium">{p.title || "منتج"}</p>
              {priceLabel ? (
                <p className="mt-0.5 text-sm font-bold" style={{ color: "var(--pp-accent)" }}>
                  {priceLabel}
                </p>
              ) : null}
            </>
          );

          return p.href ? (
            <a
              key={i}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="block transition-transform hover:-translate-y-0.5"
            >
              {inner}
            </a>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </BlockShell>
  );
}
