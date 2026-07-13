import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FulfillmentControl } from "@/components/dashboard/fulfillment-control";
import { formatMoney } from "@/lib/payments/money";
import { kindLabel, PRODUCT_TYPE_LABEL } from "@/lib/payments/service";
import { asRecord, str } from "@/lib/public/block-config";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PAID: { label: "مدفوع", cls: "bg-primary/10 text-primary" },
  PENDING: { label: "معلّق", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  FAILED: { label: "فاشل", cls: "bg-destructive/10 text-destructive" },
  REFUNDED: { label: "مُسترجَع", cls: "bg-muted text-muted-foreground" },
  CANCELLED: { label: "ملغى", cls: "bg-muted text-muted-foreground" },
};

const FULFILL_LABEL: Record<string, string> = {
  PENDING: "بانتظار التجهيز",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التسليم",
  CANCELLED: "أُلغي",
};

// وسم نوع الطلب: منتج (حسب نوعه) أو بلوك مدفوع.
function orderLabel(o: {
  productId: string | null;
  blockType: string | null;
  metadata: unknown;
  productType?: string | null;
}): string {
  if (o.productId) {
    const t = str(asRecord(o.metadata).productType) || o.productType || "DIGITAL";
    return PRODUCT_TYPE_LABEL[t] ?? "منتج";
  }
  return kindLabel(o.blockType);
}

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/orders");

  // ملكية: طلبات ملف هذا المستخدم فقط (من session.sub).
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) redirect("/dashboard");

  const orders = await prisma.order.findMany({
    where: { creatorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      product: { select: { type: true } },
      shippingAddress: { select: { fullName: true, city: true, country: true } },
    },
  });

  const paidTotal = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.amount, 0);
  const paidCurrency = orders.find((o) => o.status === "PAID")?.currency ?? "USD";

  return (
    <DashboardShell active="orders" email={session.email}>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-foreground">الطلبات والمبيعات</h1>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">
              الطلبات: <strong className="text-foreground">{orders.length}</strong>
            </span>
            <span className="text-muted-foreground">
              المبيعات المدفوعة:{" "}
              <strong className="text-primary">
                {formatMoney(paidTotal, paidCurrency)}
              </strong>
            </span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            لا طلبات بعد. فعّل بلوك مدفوع أو أضِف منتجاً في متجرك.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-start font-medium">المشتري</th>
                  <th className="p-3 text-start font-medium">النوع</th>
                  <th className="p-3 text-start font-medium">المبلغ</th>
                  <th className="p-3 text-start font-medium">الحالة</th>
                  <th className="p-3 text-start font-medium">الشحن / التنفيذ</th>
                  <th className="p-3 text-start font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const meta = asRecord(o.metadata);
                  const s = STATUS_LABEL[o.status] ?? {
                    label: o.status,
                    cls: "bg-muted text-muted-foreground",
                  };
                  const isPhysical = o.product?.type === "PHYSICAL";
                  return (
                    <tr key={o.id} className="border-t border-border align-top">
                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          {o.buyerName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {o.buyerEmail}
                        </div>
                      </td>
                      <td className="p-3 text-foreground">
                        {orderLabel({
                          productId: o.productId,
                          blockType: o.blockType,
                          metadata: o.metadata,
                          productType: o.product?.type,
                        })}
                        <div className="text-xs text-muted-foreground">
                          {str(meta.title)}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {formatMoney(o.amount, o.currency)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="p-3">
                        {isPhysical && o.status === "PAID" ? (
                          <FulfillmentControl
                            orderId={o.id}
                            initialStatus={o.fulfillmentStatus ?? "PENDING"}
                            initialTracking={o.trackingNumber}
                          />
                        ) : isPhysical ? (
                          <span className="text-xs text-muted-foreground">
                            {FULFILL_LABEL[o.fulfillmentStatus ?? "PENDING"]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {o.createdAt.toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
