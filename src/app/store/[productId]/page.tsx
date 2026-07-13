import { notFound } from "next/navigation";
import { loadPurchasableProduct } from "@/lib/payments/service";
import { formatMoney } from "@/lib/payments/money";
import { arr, str } from "@/lib/public/block-config";
import { safeHref } from "@/lib/public/safe-url";
import { ResponsiveImage } from "@/components/public/responsive-image";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function StoreProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<SP>;
}) {
  const { productId } = await params;
  const sp = await searchParams;
  const error = one(sp.error);

  const item = await loadPurchasableProduct(productId);
  if (!item) notFound();

  const priceLabel = formatMoney(item.amountMinor, item.currency);
  const firstImage = safeHref(arr(item.product.images).map((u) => str(u))[0]);

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <span className="flex mx-auto size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            A
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {firstImage ? (
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <ResponsiveImage
                url={firstImage}
                variant="gallery"
                alt={item.title}
                className="size-full object-cover"
              />
            </div>
          ) : null}

          <div className="p-6">
            <p className="text-xs text-muted-foreground">
              منتج رقميّ · {item.creatorProfile.displayName}
            </p>
            <h1 className="mt-1 text-xl font-bold text-foreground">
              {item.title}
            </h1>
            {item.description ? (
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {item.description}
              </p>
            ) : null}
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-primary">
                {priceLabel}
              </span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              بعد الدفع ستصلك رسالة بريد فيها رابط تحميل خاصّ وآمن.
            </p>

            {error ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <form
              method="post"
              action="/api/pay/product-checkout"
              className="mt-5 space-y-3"
            >
              <input type="hidden" name="productId" value={item.product.id} />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">
                  الاسم
                </span>
                <input
                  name="buyerName"
                  required
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  placeholder="اسمك"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">
                  البريد الإلكتروني (سيصلك عليه رابط التحميل)
                </span>
                <input
                  name="buyerEmail"
                  type="email"
                  required
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  placeholder="you@example.com"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                الشراء والتحميل — {priceLabel}
              </button>
            </form>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              دفع تجريبيّ (mock) — لن يُخصَم أيّ مبلغ حقيقيّ.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
