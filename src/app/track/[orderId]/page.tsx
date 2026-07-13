import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/payments/money";
import { asRecord, str } from "@/lib/public/block-config";
import { normalizeEmail } from "@/lib/validation";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

const STEPS: { key: string; label: string }[] = [
  { key: "PENDING", label: "بانتظار التجهيز" },
  { key: "PROCESSING", label: "قيد التجهيز" },
  { key: "SHIPPED", label: "تم الشحن" },
  { key: "DELIVERED", label: "تم التسليم" },
];
const STATUS_LABEL: Record<string, string> = {
  ...Object.fromEntries(STEPS.map((s) => [s.key, s.label])),
  CANCELLED: "أُلغي",
};

// متابعة طلب فيزيائيّ — تحقّق بسيط: معرّف الطلب + مطابقة البريد (بلا تعداد).
export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<SP>;
}) {
  const { orderId } = await params;
  const sp = await searchParams;
  const email = normalizeEmail(one(sp.e) ?? "");

  const order = email
    ? await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          product: { select: { title: true, type: true } },
          shippingAddress: true,
        },
      })
    : null;

  // مطابقة البريد إلزاميّة — عدم المطابقة = «غير موجود» (لا كشف).
  const valid =
    order &&
    order.status === "PAID" &&
    order.product?.type === "PHYSICAL" &&
    normalizeEmail(order.buyerEmail) === email;

  if (!valid) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-lg font-bold text-foreground">متابعة الطلب</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            لم نعثر على طلب مطابق. تأكّد من الرابط والبريد الإلكترونيّ.
          </p>
          <form method="get" className="mt-5 space-y-3 text-start">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-foreground">
                بريدك الإلكترونيّ
              </span>
              <input
                name="e"
                type="email"
                required
                defaultValue={email || ""}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="you@example.com"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              عرض الحالة
            </button>
          </form>
        </div>
      </main>
    );
  }

  const status = order.fulfillmentStatus ?? "PENDING";
  const cancelled = status === "CANCELLED";
  const activeIdx = STEPS.findIndex((s) => s.key === status);
  const meta = asRecord(order.metadata);
  const a = order.shippingAddress;

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs text-muted-foreground">متابعة الطلب</p>
        <h1 className="mt-1 text-xl font-bold text-foreground">
          {str(meta.title) || order.product?.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          المبلغ: {formatMoney(order.amount, order.currency)} · بتاريخ{" "}
          {order.createdAt.toISOString().slice(0, 10)}
        </p>

        <div className="mt-4 rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              الحالة: {STATUS_LABEL[status]}
            </span>
            {order.trackingNumber ? (
              <span className="text-xs text-muted-foreground">
                تتبّع: {order.trackingNumber}
              </span>
            ) : null}
          </div>

          {cancelled ? (
            <p className="text-sm text-destructive">أُلغي هذا الطلب.</p>
          ) : (
            <ol className="space-y-2">
              {STEPS.map((s, i) => {
                const reached = i <= activeIdx;
                return (
                  <li key={s.key} className="flex items-center gap-2 text-sm">
                    <span
                      className={`flex size-5 items-center justify-center rounded-full text-[11px] ${
                        reached
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {reached ? "✓" : i + 1}
                    </span>
                    <span
                      className={reached ? "text-foreground" : "text-muted-foreground"}
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {a ? (
          <div className="mt-3 rounded-xl border border-border p-4 text-sm">
            <p className="mb-1 font-medium text-foreground">عنوان الشحن</p>
            <p className="text-muted-foreground">
              {a.fullName} · {a.phone}
              <br />
              {a.line}، {a.city}، {a.country}
              {a.postalCode ? ` (${a.postalCode})` : ""}
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
