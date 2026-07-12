import { prisma } from "@/lib/prisma";
import { asRecord, str, num } from "@/lib/public/block-config";
import {
  isValidEmail,
  normalizeEmail,
} from "@/lib/validation";
import {
  getPaymentProvider,
  toMinor,
  formatMoney,
  isSupportedCurrency,
} from "@/lib/payments";
import type { NormalizedEvent } from "@/lib/payments/types";
import {
  sendOrderBuyerConfirmation,
  sendOrderCreatorNotification,
} from "@/lib/email";

export class CheckoutError extends Error {}

const PAID_TYPES = new Set(["CONSULTATION", "PAID_VIDEO"]);

export function kindLabel(blockType: string): string {
  return blockType === "CONSULTATION" ? "استشارة" : "فيديو خاص";
}

// يحمّل بلوكاً مدفوعاً قابلاً للشراء (منشور · ظاهر · نوع مدفوع) مع سعره من القاعدة.
export async function loadPurchasableBlock(blockId: string) {
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    include: {
      page: {
        include: {
          creatorProfile: { select: { id: true, displayName: true, isPublished: true } },
        },
      },
    },
  });
  if (
    !block ||
    !block.visibility ||
    !PAID_TYPES.has(block.type) ||
    !block.page?.creatorProfile?.isPublished
  ) {
    return null;
  }
  const c = asRecord(block.config);
  const price = num(c.price);
  const currency = str(c.currency) || "USD";
  if (price === null || price <= 0 || !isSupportedCurrency(currency)) {
    return null;
  }
  return {
    block,
    creatorProfile: block.page.creatorProfile,
    title: str(c.title) || kindLabel(block.type),
    description: str(c.description),
    duration: str(c.duration),
    price,
    currency,
    amountMinor: toMinor(price, currency),
  };
}

export interface CreateOrderInput {
  blockId: string;
  buyerName: string;
  buyerEmail: string;
  instructions?: string;
}

// ينشئ طلباً PENDING بسعر القاعدة (لا سعر العميل) ويبدأ الدفع عبر المزوّد.
export async function createOrderForBlock(input: CreateOrderInput) {
  const purchasable = await loadPurchasableBlock(input.blockId);
  if (!purchasable) {
    throw new CheckoutError("هذا العنصر غير متاح للشراء.");
  }

  const buyerName = input.buyerName.trim().slice(0, 120);
  const buyerEmail = normalizeEmail(input.buyerEmail);
  if (!buyerName) throw new CheckoutError("الاسم مطلوب.");
  if (!isValidEmail(buyerEmail)) throw new CheckoutError("بريد إلكترونيّ غير صالح.");

  const order = await prisma.order.create({
    data: {
      creatorProfileId: purchasable.creatorProfile.id,
      buyerName,
      buyerEmail,
      blockType: purchasable.block.type,
      blockId: purchasable.block.id,
      amount: purchasable.amountMinor, // من القاعدة — لا من العميل
      currency: purchasable.currency,
      status: "PENDING",
      provider: getPaymentProvider().id,
      metadata: {
        title: purchasable.title,
        duration: purchasable.duration || undefined,
        instructions: input.instructions?.slice(0, 1000) || undefined,
      },
    },
    select: { id: true },
  });

  const provider = getPaymentProvider();
  const payment = await provider.createPayment({
    orderId: order.id,
    amount: purchasable.amountMinor,
    currency: purchasable.currency,
    description: purchasable.title,
    buyerEmail,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { providerRef: payment.providerRef },
  });

  return { orderId: order.id, checkoutUrl: payment.checkoutUrl };
}

// معالجة حدث دفع موحّد — idempotent (لا ينتقل إلا من PENDING مرّة واحدة).
export async function processPaymentEvent(
  event: NormalizedEvent,
): Promise<{ handled: boolean; alreadyProcessed?: boolean }> {
  const order = await prisma.order.findUnique({
    where: { providerRef: event.providerRef },
    include: {
      creatorProfile: {
        select: { displayName: true, user: { select: { email: true } } },
      },
    },
  });
  if (!order) return { handled: false };

  // idempotency: أيّ حالة نهائيّة → لا إعادة معالجة.
  if (order.status !== "PENDING") {
    return { handled: true, alreadyProcessed: true };
  }

  if (event.type === "payment.failed") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    return { handled: true };
  }

  // payment.succeeded
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID" },
  });

  const meta = asRecord(order.metadata);
  const emailData = {
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    itemTitle: str(meta.title) || kindLabel(order.blockType),
    amountLabel: formatMoney(order.amount, order.currency),
    kindLabel: kindLabel(order.blockType),
    instructions: str(meta.instructions) || undefined,
    creatorName: order.creatorProfile.displayName,
  };
  await sendOrderBuyerConfirmation(emailData);
  const creatorEmail = order.creatorProfile.user?.email;
  if (creatorEmail) {
    await sendOrderCreatorNotification(creatorEmail, emailData);
  }

  return { handled: true };
}
