import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/payments/money";
import { kindLabel } from "@/lib/payments/service";
import { asRecord, str } from "@/lib/public/block-config";

export const dynamic = "force-dynamic";

// صفحة الدفع المستضافة (mock) — يختار المشتري محاكاة نجاح/فشل.
export default async function MockPayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) notFound();
  if (order.status !== "PENDING") redirect(`/pay/${orderId}/result`);

  const meta = asRecord(order.metadata);
  const title = str(meta.title) || kindLabel(order.blockType);
  const priceLabel = formatMoney(order.amount, order.currency);

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
          صفحة دفع تجريبيّة (mock) — بيئة اختبار
        </div>

        <h1 className="mt-4 text-lg font-bold text-foreground">إتمام الدفع</h1>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">العنصر</span>
            <span className="font-medium text-foreground">{title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">المشتري</span>
            <span className="font-medium text-foreground">{order.buyerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">المبلغ</span>
            <span className="font-bold text-primary">{priceLabel}</span>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <form method="post" action="/api/pay/mock/confirm">
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="outcome" value="success" />
            <button
              type="submit"
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              محاكاة دفع ناجح
            </button>
          </form>
          <form method="post" action="/api/pay/mock/confirm">
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="outcome" value="fail" />
            <button
              type="submit"
              className="w-full rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              محاكاة فشل الدفع
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
