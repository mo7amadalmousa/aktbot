import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/payments/money";
import { kindLabel } from "@/lib/payments/service";
import { asRecord, str } from "@/lib/public/block-config";

export const dynamic = "force-dynamic";

export default async function PayResultPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { creatorProfile: { select: { username: true } } },
  });
  if (!order) notFound();

  const meta = asRecord(order.metadata);
  const title = str(meta.title) || kindLabel(order.blockType);
  const paid = order.status === "PAID";
  const productType = str(meta.productType);
  const deliveryNote = !paid
    ? ""
    : productType === "COURSE"
      ? " أرسلنا لبريدك رابط الوصول للكورس."
      : productType === "PHYSICAL"
        ? " أرسلنا لبريدك تأكيداً ورابط متابعة الشحن."
        : productType === "DIGITAL"
          ? " أرسلنا لبريدك رابط التحميل الآمن."
          : " أرسلنا لك بريد تأكيد، وسيتواصل معك المبدع.";

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div
          className={`mx-auto flex size-12 items-center justify-center rounded-full text-2xl ${
            paid
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {paid ? "✓" : "✕"}
        </div>
        <h1 className="mt-4 text-xl font-bold text-foreground">
          {paid ? "تم الدفع بنجاح" : "لم يكتمل الدفع"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {paid
            ? `تم استلام طلبك «${title}» (${formatMoney(order.amount, order.currency)}).${deliveryNote}`
            : `لم تكتمل عملية الدفع لطلب «${title}». لم يُخصَم أيّ مبلغ.`}
        </p>
        <Link
          href={`/u/${order.creatorProfile.username}`}
          className="mt-6 inline-block rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          العودة إلى الصفحة
        </Link>
      </div>
    </main>
  );
}
