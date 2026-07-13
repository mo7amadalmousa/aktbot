import { prisma } from "@/lib/prisma";
import { asRecord, str } from "@/lib/public/block-config";
import type { SaleType, CommissionScope } from "@/generated/prisma/enums";

// ── محرّك العمولة الهرميّ ──────────────────────────────────────────────
// القاعدة الأخصّ تفوز، ثم الأولوية، ثم الأحدث. كلّها بدقّة عدد صحيح (minor/bps).

// عمولة افتراضيّة إن لم توجد أيّ قاعدة (حتّى GLOBAL) — لا صفر صامت.
export const DEFAULT_COMMISSION_BPS = 1000; // 10.00%

// رتبة التخصّص: الأعلى يفوز.
const SCOPE_RANK: Record<string, number> = {
  BY_CAMPAIGN: 5,
  BY_CREATOR: 4,
  BY_BRAND: 3,
  BY_TYPE: 2,
  GLOBAL: 1,
};

// شكل قاعدة كما تُقرأ من القاعدة (الحقول التي يحتاجها المحرّك).
export interface RuleRow {
  id: string;
  scope: CommissionScope;
  targetId: string | null;
  saleType: SaleType | null;
  percentBps: number | null;
  fixedAmount: number | null;
  priority: number;
  startAt: Date | null;
  endAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CommissionContext {
  saleType: SaleType;
  creatorProfileId: string;
  brandId?: string | null;
  campaignId?: string | null;
  now: Date;
}

function withinWindow(r: RuleRow, now: Date): boolean {
  if (r.startAt && r.startAt.getTime() > now.getTime()) return false;
  if (r.endAt && r.endAt.getTime() < now.getTime()) return false;
  return true;
}

// هل تنطبق القاعدة على السياق؟ (فلتر saleType يسري على كلّ المستويات إن مُحدَّد.)
function matches(r: RuleRow, ctx: CommissionContext): boolean {
  if (r.saleType && r.saleType !== ctx.saleType) return false;
  switch (r.scope) {
    case "GLOBAL":
      return true;
    case "BY_TYPE":
      return r.saleType === ctx.saleType; // نوع البيع هو الهدف
    case "BY_CREATOR":
      return !!r.targetId && r.targetId === ctx.creatorProfileId;
    case "BY_BRAND":
      return !!r.targetId && r.targetId === ctx.brandId;
    case "BY_CAMPAIGN":
      return !!r.targetId && r.targetId === ctx.campaignId;
    default:
      return false;
  }
}

// حلّ القاعدة المطبّقة: الأخصّ → الأولوية الأعلى → الأحدث. null إن لا مطابقة.
export function resolveRule(
  rules: RuleRow[],
  ctx: CommissionContext,
): RuleRow | null {
  const applicable = rules.filter(
    (r) => r.isActive && withinWindow(r, ctx.now) && matches(r, ctx),
  );
  if (applicable.length === 0) return null;
  applicable.sort((a, b) => {
    const rank = (SCOPE_RANK[b.scope] ?? 0) - (SCOPE_RANK[a.scope] ?? 0);
    if (rank !== 0) return rank;
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return applicable[0];
}

export interface ComputedCommission {
  commissionAmount: number;
  netCreatorAmount: number;
  appliedRuleId: string | null;
  percentBps: number | null;
}

// يحسب العمولة/الصافي من قاعدة (أو الافتراضيّ) — عدد صحيح، لا يتجاوز الإجماليّ.
export function computeCommission(
  gross: number,
  rule: RuleRow | null,
): ComputedCommission {
  let commission: number;
  let appliedRuleId: string | null = null;
  let percentBps: number | null = null;

  if (rule && rule.fixedAmount != null) {
    commission = rule.fixedAmount;
    appliedRuleId = rule.id;
  } else if (rule && rule.percentBps != null) {
    commission = Math.round((gross * rule.percentBps) / 10000);
    appliedRuleId = rule.id;
    percentBps = rule.percentBps;
  } else {
    // لا قاعدة → الافتراضيّ الشامل (appliedRuleId يبقى null).
    commission = Math.round((gross * DEFAULT_COMMISSION_BPS) / 10000);
    percentBps = DEFAULT_COMMISSION_BPS;
  }

  commission = Math.max(0, Math.min(commission, gross)); // لا سالب ولا يتجاوز الإجماليّ
  return {
    commissionAmount: commission,
    netCreatorAmount: gross - commission,
    appliedRuleId,
    percentBps,
  };
}

// نوع البيع من الطلب (مصدر واحد للتصنيف).
export function saleTypeForOrder(order: {
  productId: string | null;
  blockType: string | null;
  metadata: unknown;
  product?: { type: string } | null;
}): SaleType {
  if (order.productId) {
    const t = order.product?.type;
    if (t === "COURSE") return "STORE_COURSE";
    if (t === "PHYSICAL") return "STORE_PHYSICAL";
    return "STORE_DIGITAL";
  }
  if (str(asRecord(order.metadata).kind) === "booking") return "BOOKING";
  if (order.blockType === "PAID_VIDEO") return "VIDEO";
  return "CONSULTATION";
}

// ── نقطة التطبيق: تُستدعى عند تأكيد الدفع (Order=PAID) لكلّ المصادر ─────
// idempotent عبر CommissionLedger.orderId الفريد (لا تسجيل مزدوج للـwebhook المكرّر).
export async function accrueCommission(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      amount: true,
      currency: true,
      creatorProfileId: true,
      productId: true,
      blockType: true,
      metadata: true,
      status: true,
      product: { select: { type: true } },
    },
  });
  if (!order || order.status !== "PAID") return;

  // موجود مسبقاً؟ (حارس إضافيّ فوق القيد الفريد.)
  const existing = await prisma.commissionLedger.findUnique({
    where: { orderId },
    select: { id: true },
  });
  if (existing) return;

  const saleType = saleTypeForOrder(order);
  const rules = await prisma.commissionRule.findMany({ where: { isActive: true } });
  const rule = resolveRule(rules as RuleRow[], {
    saleType,
    creatorProfileId: order.creatorProfileId,
    brandId: null,
    campaignId: null,
    now: new Date(),
  });
  const computed = computeCommission(order.amount, rule);

  try {
    await prisma.commissionLedger.create({
      data: {
        orderId: order.id,
        creatorProfileId: order.creatorProfileId,
        saleType,
        grossAmount: order.amount,
        commissionAmount: computed.commissionAmount,
        netCreatorAmount: computed.netCreatorAmount,
        appliedRuleId: computed.appliedRuleId,
        currency: order.currency,
        status: "ACCRUED",
      },
    });
  } catch (e) {
    // تصادم القيد الفريد (webhook متزامن) → صفّ واحد فقط.
    if (!(e && typeof e === "object" && (e as { code?: string }).code === "P2002")) {
      throw e;
    }
  }
}

// عكس العمولة عند استرداد/إلغاء (بنية جاهزة — لا مسار استرداد حيّ الآن). لا حذف.
export async function reverseCommission(orderId: string): Promise<void> {
  await prisma.commissionLedger
    .updateMany({
      where: { orderId, status: "ACCRUED" },
      data: { status: "REVERSED" },
    })
    .catch(() => {});
}
