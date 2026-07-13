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
import { generateToken, hashToken } from "@/lib/auth/tokens";
import {
  sendOrderBuyerConfirmation,
  sendOrderCreatorNotification,
  sendProductDeliveryEmail,
  sendProductSaleNotification,
} from "@/lib/email";

export class CheckoutError extends Error {}

const PAID_TYPES = new Set(["CONSULTATION", "PAID_VIDEO"]);

// صلاحية رابط التحميل وحدّ مرّاته — بعد الدفع المؤكّد.
const DOWNLOAD_TTL_DAYS = 30;
const DOWNLOAD_MAX = 5;

// وسم نوع الطلب في العرض. منتج المتجر → «منتج رقميّ».
export function kindLabel(blockType: string | null | undefined): string {
  if (blockType === "CONSULTATION") return "استشارة";
  if (blockType === "PAID_VIDEO") return "فيديو خاص";
  return "منتج رقميّ";
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

// يحمّل منتجاً رقميّاً قابلاً للشراء (فعّال · DIGITAL · له ملف · مبدع منشور) بسعر القاعدة.
export async function loadPurchasableProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      creatorProfile: {
        select: { id: true, displayName: true, isPublished: true, username: true },
      },
      assets: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (
    !product ||
    !product.isActive ||
    product.type !== "DIGITAL" ||
    !product.creatorProfile.isPublished ||
    product.assets.length === 0 || // منتج رقميّ بلا ملف = غير قابل للتسليم
    product.price <= 0 ||
    !isSupportedCurrency(product.currency)
  ) {
    return null;
  }
  return {
    product,
    creatorProfile: product.creatorProfile,
    asset: product.assets[0],
    title: product.title,
    description: product.description ?? "",
    amountMinor: product.price, // مُخزَّن أصلاً كأصغر وحدة
    currency: product.currency,
  };
}

export interface CreateOrderInput {
  blockId: string;
  buyerName: string;
  buyerEmail: string;
  instructions?: string;
}

function cleanBuyer(name: string, email: string) {
  const buyerName = name.trim().slice(0, 120);
  const buyerEmail = normalizeEmail(email);
  if (!buyerName) throw new CheckoutError("الاسم مطلوب.");
  if (!isValidEmail(buyerEmail)) throw new CheckoutError("بريد إلكترونيّ غير صالح.");
  return { buyerName, buyerEmail };
}

// ينشئ طلباً PENDING بسعر القاعدة (لا سعر العميل) ويبدأ الدفع عبر المزوّد.
export async function createOrderForBlock(input: CreateOrderInput) {
  const purchasable = await loadPurchasableBlock(input.blockId);
  if (!purchasable) {
    throw new CheckoutError("هذا العنصر غير متاح للشراء.");
  }

  const { buyerName, buyerEmail } = cleanBuyer(input.buyerName, input.buyerEmail);

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

export interface CreateProductOrderInput {
  productId: string;
  buyerName: string;
  buyerEmail: string;
}

// ينشئ طلب منتج PENDING بسعر القاعدة ويبدأ الدفع عبر المزوّد.
export async function createOrderForProduct(input: CreateProductOrderInput) {
  const purchasable = await loadPurchasableProduct(input.productId);
  if (!purchasable) {
    throw new CheckoutError("هذا المنتج غير متاح للشراء.");
  }

  const { buyerName, buyerEmail } = cleanBuyer(input.buyerName, input.buyerEmail);

  const order = await prisma.order.create({
    data: {
      creatorProfileId: purchasable.creatorProfile.id,
      buyerName,
      buyerEmail,
      productId: purchasable.product.id,
      amount: purchasable.amountMinor, // من القاعدة — لا من العميل
      currency: purchasable.currency,
      status: "PENDING",
      provider: getPaymentProvider().id,
      metadata: { title: purchasable.title, kind: "product" },
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

// تسليم منتج رقميّ: توليد DownloadToken آمن (مرّة واحدة لكل طلب) + بريد المشتري والمبدع.
async function deliverDigitalProduct(order: {
  id: string;
  productId: string | null;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  currency: string;
  creatorProfile: { displayName: string; user: { email: string } | null };
}) {
  if (!order.productId) return;

  const product = await prisma.product.findUnique({
    where: { id: order.productId },
    include: { assets: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const asset = product?.assets[0];
  if (!product || !asset) return; // لا ملف → لا شيء يُسلَّم (نادر: حُذف بعد الطلب)

  // idempotency إضافيّة: لا توكن مكرّر لنفس الطلب (فوق حارس PENDING).
  const existing = await prisma.downloadToken.findFirst({
    where: { orderId: order.id },
    select: { id: true },
  });
  if (existing) return;

  const rawToken = generateToken();
  await prisma.downloadToken.create({
    data: {
      orderId: order.id,
      productAssetId: asset.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + DOWNLOAD_TTL_DAYS * 24 * 60 * 60 * 1000),
      maxDownloads: DOWNLOAD_MAX,
    },
  });

  const amountLabel = formatMoney(order.amount, order.currency);
  await sendProductDeliveryEmail(
    {
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      productTitle: product.title,
      fileName: asset.fileName,
      amountLabel,
      creatorName: order.creatorProfile.displayName,
      expiresDays: DOWNLOAD_TTL_DAYS,
      maxDownloads: DOWNLOAD_MAX,
    },
    rawToken,
  );
  const creatorEmail = order.creatorProfile.user?.email;
  if (creatorEmail) {
    await sendProductSaleNotification(creatorEmail, {
      creatorName: order.creatorProfile.displayName,
      productTitle: product.title,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      amountLabel,
    });
  }
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

  // payment.succeeded — انتقال ذرّيّ إلى PAID (الحقيقة من الـwebhook).
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID" },
  });

  // مسار المنتج الرقميّ: تسليم رابط تحميل آمن.
  if (order.productId) {
    await deliverDigitalProduct(order);
    return { handled: true };
  }

  // مسار البلوك المدفوع (استشارة/فيديو): بريد تأكيد + إشعار المبدع.
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
