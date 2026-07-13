import { prisma } from "@/lib/prisma";
import { asRecord, str, num } from "@/lib/public/block-config";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import {
  getPaymentProvider,
  toMinor,
  formatMoney,
  isSupportedCurrency,
} from "@/lib/payments";
import type { NormalizedEvent } from "@/lib/payments/types";
import type { ProductType } from "@/generated/prisma/enums";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import {
  sendOrderBuyerConfirmation,
  sendOrderCreatorNotification,
  sendProductDeliveryEmail,
  sendProductSaleNotification,
  sendCourseAccessEmail,
  sendCourseSaleNotification,
  sendPhysicalOrderConfirmation,
  sendPhysicalSaleNotification,
} from "@/lib/email";

export class CheckoutError extends Error {}

const PAID_TYPES = new Set(["CONSULTATION", "PAID_VIDEO"]);

// صلاحية رابط التحميل وحدّ مرّاته — بعد الدفع المؤكّد.
const DOWNLOAD_TTL_DAYS = 30;
const DOWNLOAD_MAX = 5;

// وسوم أنواع منتجات المتجر (للعرض/البريد).
export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  DIGITAL: "منتج رقميّ",
  COURSE: "كورس",
  PHYSICAL: "منتج فيزيائيّ",
};

// وسم نوع الطلب في العرض. طلب بلوك → استشارة/فيديو؛ طلب منتج → حسب النوع.
export function kindLabel(blockType: string | null | undefined): string {
  if (blockType === "CONSULTATION") return "استشارة";
  if (blockType === "PAID_VIDEO") return "فيديو خاص";
  return "منتج";
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

// يحمّل منتجاً قابلاً للشراء بأيّ نوع (فعّال · منشور · سعر من القاعدة)، مع تحقّق
// خاصّ بكلّ نوع: DIGITAL له ملف · COURSE له درس واحد على الأقل · PHYSICAL بمخزون
// متاح (إن كان محدوداً). amountMinor يشمل رسوم الشحن للفيزيائيّ.
export async function loadPurchasableProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      creatorProfile: {
        select: { id: true, displayName: true, isPublished: true, username: true },
      },
      assets: { orderBy: { createdAt: "asc" }, take: 1 },
      modules: { select: { lessons: { select: { id: true }, take: 1 } } },
    },
  });
  if (
    !product ||
    !product.isActive ||
    !product.creatorProfile.isPublished ||
    product.price <= 0 ||
    !isSupportedCurrency(product.currency)
  ) {
    return null;
  }

  // تحقّق خاصّ بالنوع.
  if (product.type === "DIGITAL" && product.assets.length === 0) return null;
  if (
    product.type === "COURSE" &&
    !product.modules.some((m) => m.lessons.length > 0)
  ) {
    return null;
  }
  if (product.type === "PHYSICAL" && product.stock !== null && product.stock <= 0) {
    return null; // نفد المخزون
  }

  const shippingFee = product.type === "PHYSICAL" ? product.shippingFee ?? 0 : 0;
  return {
    product,
    creatorProfile: product.creatorProfile,
    asset: product.assets[0] ?? null,
    title: product.title,
    description: product.description ?? "",
    productPrice: product.price,
    shippingFee,
    amountMinor: product.price + shippingFee,
    currency: product.currency,
  };
}

export interface CreateOrderInput {
  blockId: string;
  buyerName: string;
  buyerEmail: string;
  instructions?: string;
  participationId?: string | null; // إسناد حملة (اختياريّ)
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
      participationId: input.participationId ?? null,
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

export interface ShippingInput {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  line: string;
  postalCode?: string;
}

export interface CreateProductOrderInput {
  productId: string;
  buyerName: string;
  buyerEmail: string;
  shipping?: ShippingInput;
  participationId?: string | null; // إسناد حملة (اختياريّ)
}

function cleanShipping(raw: ShippingInput | undefined): {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  line: string;
  postalCode: string | null;
} {
  const fullName = (raw?.fullName ?? "").trim().slice(0, 120);
  const phone = (raw?.phone ?? "").trim().slice(0, 40);
  const country = (raw?.country ?? "").trim().slice(0, 80);
  const city = (raw?.city ?? "").trim().slice(0, 80);
  const line = (raw?.line ?? "").trim().slice(0, 240);
  const postalCode = (raw?.postalCode ?? "").trim().slice(0, 20) || null;
  if (!fullName || !phone || !country || !city || !line) {
    throw new CheckoutError("عنوان الشحن ناقص — أكمل كلّ الحقول المطلوبة.");
  }
  return { fullName, phone, country, city, line, postalCode };
}

// ينشئ طلب منتج PENDING بسعر القاعدة (يشمل الشحن للفيزيائيّ) ويبدأ الدفع.
export async function createOrderForProduct(input: CreateProductOrderInput) {
  const purchasable = await loadPurchasableProduct(input.productId);
  if (!purchasable) {
    throw new CheckoutError("هذا المنتج غير متاح للشراء.");
  }
  const type = purchasable.product.type as ProductType;
  const { buyerName, buyerEmail } = cleanBuyer(input.buyerName, input.buyerEmail);

  // الفيزيائيّ يتطلّب عنوان شحن مكتملاً.
  const shipping = type === "PHYSICAL" ? cleanShipping(input.shipping) : null;

  const order = await prisma.order.create({
    data: {
      creatorProfileId: purchasable.creatorProfile.id,
      buyerName,
      buyerEmail,
      productId: purchasable.product.id,
      participationId: input.participationId ?? null,
      amount: purchasable.amountMinor, // سعر القاعدة (+ الشحن) — لا من العميل
      currency: purchasable.currency,
      status: "PENDING",
      provider: getPaymentProvider().id,
      ...(type === "PHYSICAL"
        ? {
            fulfillmentStatus: "PENDING" as const,
            shippingFee: purchasable.shippingFee,
            shippingAddress: shipping ? { create: shipping } : undefined,
          }
        : {}),
      metadata: {
        title: purchasable.title,
        kind: "product",
        productType: type,
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

// ── تسليم رقميّ: توكن تحميل آمن + بريد ────────────────────────────────
async function deliverDigitalProduct(order: DeliverOrder) {
  if (!order.productId) return;
  const product = await prisma.product.findUnique({
    where: { id: order.productId },
    include: { assets: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const asset = product?.assets[0];
  if (!product || !asset) return;

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

// ── تسجيل الكورس: Enrollment برابط وصول آمن + بريد ────────────────────
async function enrollCourseBuyer(order: DeliverOrder) {
  if (!order.productId) return;
  const product = await prisma.product.findUnique({
    where: { id: order.productId },
    select: { id: true, title: true },
  });
  if (!product) return;

  const existing = await prisma.courseEnrollment.findUnique({
    where: { orderId: order.id },
    select: { id: true },
  });
  if (existing) return;

  const rawToken = generateToken();
  await prisma.courseEnrollment.create({
    data: {
      orderId: order.id,
      productId: product.id,
      buyerEmail: order.buyerEmail,
      tokenHash: hashToken(rawToken),
    },
  });

  const amountLabel = formatMoney(order.amount, order.currency);
  await sendCourseAccessEmail(
    {
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      courseTitle: product.title,
      amountLabel,
      creatorName: order.creatorProfile.displayName,
    },
    rawToken,
  );
  const creatorEmail = order.creatorProfile.user?.email;
  if (creatorEmail) {
    await sendCourseSaleNotification(creatorEmail, {
      creatorName: order.creatorProfile.displayName,
      courseTitle: product.title,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      amountLabel,
    });
  }
}

// ── تنفيذ الفيزيائيّ: خصم المخزون + بريد تأكيد ورابط متابعة ──────────
async function fulfillPhysicalOrder(order: DeliverOrder) {
  if (!order.productId) return;
  const product = await prisma.product.findUnique({
    where: { id: order.productId },
    select: { id: true, title: true, stock: true },
  });
  if (!product) return;

  // خصم المخزون ذرّيّاً (إن كان محدوداً) — لا ينزل تحت الصفر.
  if (product.stock !== null) {
    await prisma.product.updateMany({
      where: { id: product.id, stock: { gt: 0 } },
      data: { stock: { decrement: 1 } },
    });
  }

  const amountLabel = formatMoney(order.amount, order.currency);
  await sendPhysicalOrderConfirmation({
    orderId: order.id,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    productTitle: product.title,
    amountLabel,
    creatorName: order.creatorProfile.displayName,
  });
  const creatorEmail = order.creatorProfile.user?.email;
  if (creatorEmail) {
    const addr = await prisma.shippingAddress.findUnique({
      where: { orderId: order.id },
    });
    await sendPhysicalSaleNotification(creatorEmail, {
      creatorName: order.creatorProfile.displayName,
      productTitle: product.title,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      amountLabel,
      shipping: addr
        ? {
            fullName: addr.fullName,
            phone: addr.phone,
            country: addr.country,
            city: addr.city,
            line: addr.line,
            postalCode: addr.postalCode,
          }
        : null,
    });
  }
}

interface DeliverOrder {
  id: string;
  productId: string | null;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  currency: string;
  creatorProfile: { displayName: string; user: { email: string } | null };
}

// معالجة حدث دفع موحّد — idempotent (لا ينتقل إلا من PENDING مرّة واحدة).
export async function processPaymentEvent(
  event: NormalizedEvent,
): Promise<{ handled: boolean; alreadyProcessed?: boolean }> {
  const order = await prisma.order.findUnique({
    where: { providerRef: event.providerRef },
    include: {
      product: { select: { type: true } },
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

  // طبقة العمولة: تُحسب وتُسجَّل هنا لكلّ المصادر (idempotent عبر orderId الفريد).
  const { accrueCommission } = await import("@/lib/commission/engine");
  await accrueCommission(order.id);

  // مسار المنتج: يتفرّع حسب النوع (تسليم مختلف فوق نفس الطلب الموحّد).
  if (order.productId) {
    const type = order.product?.type;
    if (type === "COURSE") await enrollCourseBuyer(order);
    else if (type === "PHYSICAL") await fulfillPhysicalOrder(order);
    else await deliverDigitalProduct(order);
    return { handled: true };
  }

  // مسار حجز موعد مدفوع (بلوك استشارة): أكّد الحجز (بريد الطرفين) بدل البريد العامّ.
  const booking = await prisma.booking.findUnique({
    where: { orderId: order.id },
    select: { id: true },
  });
  if (booking) {
    const { confirmBookingByOrder } = await import("@/lib/booking/service");
    await confirmBookingByOrder(order.id);
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
