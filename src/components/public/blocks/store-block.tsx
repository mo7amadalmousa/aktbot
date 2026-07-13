import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { safeHref, safeCssUrl } from "@/lib/public/safe-url";
import { formatMoney, toMinor } from "@/lib/payments/money";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { BlockShell } from "./block-shell";
import { ImageIcon, Download, GraduationCap, Package } from "lucide-react";

// وسم + أيقونة + نصّ زرّ لكلّ نوع منتج داخليّ.
const TYPE_META: Record<
  string,
  { label: string; cta: string; Icon: typeof Download }
> = {
  DIGITAL: { label: "رقميّ", cta: "تحميل", Icon: Download },
  COURSE: { label: "كورس", cta: "التحاق", Icon: GraduationCap },
  PHYSICAL: { label: "منتج", cta: "شراء", Icon: Package },
};

// STORE: منتجات داخليّة حقيقيّة (زرّ شراء فعّال → /store/[id]) + منتجات خارجيّة
// (أفلييت، رابط خارجيّ). المنتجات الداخليّة تُحلّ خادميّاً في resolvedProducts.
export function StoreBlock({
  config,
  frosted,
}: {
  config: unknown;
  frosted?: boolean;
}) {
  const c = asRecord(config);
  const title = str(c.title);

  // منتجات داخليّة محلولة (id/type/title/price minor/currency/image) — سعر القاعدة.
  const internal = arr(c.resolvedProducts)
    .map((p) => {
      const r = asRecord(p);
      const id = str(r.id);
      const price = num(r.price);
      if (!id || price === null) return null;
      const type = str(r.type);
      return {
        id,
        type: TYPE_META[type] ? type : "DIGITAL",
        title: str(r.title) || "منتج",
        priceMinor: price,
        currency: str(r.currency) || "USD",
        image: safeCssUrl(r.image),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 30);

  // منتجات خارجيّة (توافق خلفيّ) — روابط شراء خارجيّة.
  const external = arr(c.products)
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

  if (internal.length === 0 && external.length === 0) {
    return (
      <BlockShell frosted={frosted}>
        <p className="text-center text-sm" style={{ opacity: 0.8 }}>
          {title || "المتجر"} — أضِف منتجات.
        </p>
      </BlockShell>
    );
  }

  const imgWrap = "mb-2 aspect-square w-full overflow-hidden";
  const imgRadius = { borderRadius: "calc(var(--pp-radius) * 0.5)" };
  const placeholder = (
    <div
      className="flex size-full items-center justify-center"
      style={{ background: "color-mix(in oklab, var(--pp-text) 8%, transparent)" }}
    >
      <ImageIcon className="size-6" style={{ opacity: 0.5 }} />
    </div>
  );

  return (
    <BlockShell frosted={frosted}>
      {title ? <p className="mb-3 text-sm font-semibold">{title}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        {/* منتجات داخليّة — شراء فعّال داخل المنصّة (بوسم النوع) */}
        {internal.map((p) => {
          const meta = TYPE_META[p.type];
          const Icon = meta.Icon;
          return (
            <a
              key={p.id}
              href={`/store/${p.id}`}
              className="group block transition-transform hover:-translate-y-0.5"
            >
              <div className={`${imgWrap} relative`} style={imgRadius}>
                <span
                  className="absolute end-1 top-1 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "var(--pp-surface, rgba(0,0,0,0.6))", color: "var(--pp-text, #fff)" }}
                >
                  <Icon className="size-3" /> {meta.label}
                </span>
                {p.image ? (
                  <ResponsiveImage
                    url={p.image}
                    variant="gallery"
                    alt={p.title}
                    className="size-full object-cover"
                  />
                ) : (
                  placeholder
                )}
              </div>
              <p className="line-clamp-2 text-sm font-medium">{p.title}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-sm font-bold" style={{ color: "var(--pp-accent)" }}>
                  {formatMoney(p.priceMinor, p.currency)}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ background: "var(--pp-accent)", color: "var(--pp-accent-contrast, #fff)" }}
                >
                  {meta.cta}
                </span>
              </div>
            </a>
          );
        })}

        {/* منتجات خارجيّة — رابط أفلييت */}
        {external.map((p, i) => {
          const priceLabel =
            p.price !== null && p.price > 0
              ? formatMoney(toMinor(p.price, p.currency), p.currency)
              : null;
          const inner = (
            <>
              <div className={imgWrap} style={imgRadius}>
                {p.imageUrl ? (
                  <ResponsiveImage
                    url={p.imageUrl}
                    variant="gallery"
                    alt={p.title}
                    className="size-full object-cover"
                  />
                ) : (
                  placeholder
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
              key={`ext-${i}`}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="block transition-transform hover:-translate-y-0.5"
            >
              {inner}
            </a>
          ) : (
            <div key={`ext-${i}`}>{inner}</div>
          );
        })}
      </div>
    </BlockShell>
  );
}
