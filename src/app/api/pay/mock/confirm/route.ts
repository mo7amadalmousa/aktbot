import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processPaymentEvent } from "@/lib/payments/service";

export const runtime = "nodejs";

// تأكيد الدفع التجريبيّ — يبني حدثاً موحّداً ويمرّره لنفس منطق الـwebhook (idempotent).
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const orderId = String(form.get("orderId") ?? "");
  const outcome = String(form.get("outcome") ?? "");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { providerRef: true },
  });

  if (order?.providerRef) {
    await processPaymentEvent({
      type: outcome === "success" ? "payment.succeeded" : "payment.failed",
      providerRef: order.providerRef,
    });
  }

  return NextResponse.redirect(new URL(`/pay/${orderId}/result`, req.url), {
    status: 303,
  });
}
