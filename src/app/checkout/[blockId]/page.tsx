import { notFound } from "next/navigation";
import { loadPurchasableBlock, kindLabel } from "@/lib/payments/service";
import { formatMoney } from "@/lib/payments/money";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ blockId: string }>;
  searchParams: Promise<SP>;
}) {
  const { blockId } = await params;
  const sp = await searchParams;
  const error = str(sp.error);

  const item = await loadPurchasableBlock(blockId);
  if (!item) notFound();

  const isVideo = item.block.type === "PAID_VIDEO";
  const priceLabel = formatMoney(item.amountMinor, item.currency);

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <span className="flex mx-auto size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            A
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs text-muted-foreground">
            {kindLabel(item.block.type)} · {item.creatorProfile.displayName}
          </p>
          <h1 className="mt-1 text-xl font-bold text-foreground">{item.title}</h1>
          {item.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {item.description}
            </p>
          ) : null}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-primary">
              {priceLabel}
            </span>
            {item.duration ? (
              <span className="text-sm text-muted-foreground">
                · {item.duration}
              </span>
            ) : null}
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <form
            method="post"
            action="/api/pay/checkout"
            className="mt-5 space-y-3"
          >
            <input type="hidden" name="blockId" value={blockId} />
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
                البريد الإلكتروني
              </span>
              <input
                name="buyerEmail"
                type="email"
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="you@example.com"
              />
            </label>
            {isVideo ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">
                  تفاصيل الطلب (لمن الفيديو؟ المناسبة؟)
                </span>
                <textarea
                  name="instructions"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  placeholder="اكتب تفاصيل طلبك…"
                />
              </label>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              المتابعة للدفع — {priceLabel}
            </button>
          </form>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            دفع تجريبيّ (mock) — لن يُخصَم أيّ مبلغ حقيقيّ.
          </p>
        </div>
      </div>
    </main>
  );
}
