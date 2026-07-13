import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { asRecord, str } from "@/lib/public/block-config";
import { sendShipmentUpdateEmail } from "@/lib/email";
import type { FulfillmentStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

const STATUS_LABEL: Record<string, string> = {
  PENDING: "بانتظار التجهيز",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التسليم",
  CANCELLED: "أُلغي",
};

// تحديث حالة تنفيذ طلب فيزيائيّ — ملكية المبدع فقط. بريد للمشتري عند الشحن.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const { id } = await params;

  // ملكية: الطلب يخصّ ملف هذا المستخدم فقط.
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "لا يوجد ملف." }, { status: 404 });
  }
  const order = await prisma.order.findUnique({
    where: { id },
    include: { product: { select: { type: true, title: true } } },
  });
  if (!order || order.creatorProfileId !== profile.id) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }
  if (order.product?.type !== "PHYSICAL") {
    return NextResponse.json(
      { ok: false, error: "هذا الطلب ليس فيزيائيّاً." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const b = asRecord(body);
  const status = str(b.status).toUpperCase();
  if (!(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ ok: false, error: "حالة غير صالحة." }, { status: 422 });
  }
  const trackingNumber = str(b.trackingNumber).slice(0, 80) || null;

  const wasShipped = order.fulfillmentStatus === "SHIPPED";
  await prisma.order.update({
    where: { id: order.id },
    data: {
      fulfillmentStatus: status as FulfillmentStatus,
      trackingNumber,
    },
  });

  // بريد للمشتري عند الانتقال إلى «تم الشحن».
  if (status === "SHIPPED" && !wasShipped) {
    await sendShipmentUpdateEmail({
      orderId: order.id,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      productTitle: order.product?.title ?? "طلبك",
      statusLabel: STATUS_LABEL.SHIPPED,
      trackingNumber,
    });
  }

  return NextResponse.json({ ok: true, status, trackingNumber });
}
