import { prisma } from "@/lib/prisma";
import { asRecord } from "@/lib/public/block-config";
import { campaignRemaining, computeSalePayout, type PayoutConfig } from "@/lib/campaign/config";

// ── احتساب مستحقات المبدع من الحملة (سجلّ CampaignPayout مصدر الحقيقة) ──
// المستحقّ بعملة الحملة · minor int · idempotent · لا يتجاوز الميزانية.

function isUnique(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && (e as { code?: string }).code === "P2002");
}

// SALE: عند بيع مُسنَد مؤكّد (PAID). عملة البيع يجب أن تساوي عملة الحملة (لا تحويل).
export async function accrueSalePayout(order: {
  id: string;
  amount: number;
  currency: string;
  participationId: string | null;
}): Promise<void> {
  if (!order.participationId) return;

  const p = await prisma.campaignParticipation.findUnique({
    where: { id: order.participationId },
    select: {
      id: true,
      status: true,
      creatorProfileId: true,
      campaign: {
        select: {
          id: true,
          type: true,
          status: true,
          currency: true,
          budgetAmount: true,
          spentAmount: true,
          payoutConfig: true,
        },
      },
    },
  });
  if (!p) return;
  const c = p.campaign;
  // الحملة نشطة · النوع SALE · المبدع منضمّ · نفس العملة (لا تحويل).
  if (c.type !== "SALE" || c.status !== "ACTIVE" || p.status !== "ACTIVE") return;
  if (!c.currency || c.currency !== order.currency) return;

  // idempotency: مستحقّ واحد لكل طلب (orderId فريد).
  const existing = await prisma.campaignPayout.findUnique({
    where: { orderId: order.id },
    select: { id: true },
  });
  if (existing) return;

  const computed = computeSalePayout(order.amount, asRecord(c.payoutConfig) as PayoutConfig);
  const remaining = campaignRemaining(c.budgetAmount, c.spentAmount);
  const amount = Math.min(computed, remaining);
  if (amount <= 0) return; // الميزانية مستنفدة → لا مستحقّ يتجاوزها

  try {
    await prisma.$transaction([
      prisma.campaignPayout.create({
        data: {
          campaignId: c.id,
          participationId: p.id,
          creatorProfileId: p.creatorProfileId,
          type: "SALE",
          amount,
          currency: c.currency,
          orderId: order.id,
          status: "ACCRUED",
        },
      }),
      prisma.campaignParticipation.update({
        where: { id: p.id },
        data: { payoutAccrued: { increment: amount } },
      }),
      prisma.campaign.update({
        where: { id: c.id },
        data: { spentAmount: { increment: amount } },
      }),
    ]);
  } catch (e) {
    if (!isUnique(e)) throw e; // تصادم سباق → مستحقّ واحد
  }
}

// PERFORMANCE: مستحقّ CPC لكل نقرة محتسَبة (يُستدعى بعد تسجيل النقرة).
export async function accruePerformancePayout(participationId: string): Promise<void> {
  const p = await prisma.campaignParticipation.findUnique({
    where: { id: participationId },
    select: {
      id: true,
      status: true,
      creatorProfileId: true,
      campaign: {
        select: {
          id: true,
          type: true,
          status: true,
          currency: true,
          budgetAmount: true,
          spentAmount: true,
          payoutConfig: true,
        },
      },
    },
  });
  if (!p) return;
  const c = p.campaign;
  if (c.type !== "PERFORMANCE" || c.status !== "ACTIVE" || p.status !== "ACTIVE") return;
  if (!c.currency) return;

  const cpc = (asRecord(c.payoutConfig) as PayoutConfig).cpcMinor ?? 0;
  if (cpc <= 0) return;
  const remaining = campaignRemaining(c.budgetAmount, c.spentAmount);
  const amount = Math.min(cpc, remaining);
  if (amount <= 0) return;

  await prisma.$transaction([
    prisma.campaignPayout.create({
      data: {
        campaignId: c.id,
        participationId: p.id,
        creatorProfileId: p.creatorProfileId,
        type: "PERFORMANCE",
        amount,
        currency: c.currency,
        status: "ACCRUED",
      },
    }),
    prisma.campaignParticipation.update({
      where: { id: p.id },
      data: { payoutAccrued: { increment: amount } },
    }),
    prisma.campaign.update({
      where: { id: c.id },
      data: { spentAmount: { increment: amount } },
    }),
  ]);
}
