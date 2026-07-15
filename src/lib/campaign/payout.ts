import { prisma } from "@/lib/prisma";
import { campaignRemaining, computeSalePayout } from "@/lib/campaign/config";

// ── احتساب مستحقات المبدع من مكوّنات الحملة (CampaignPayout مصدر الحقيقة) ──
// كل مستحقّ يُخصم من ميزانية مكوّنه فقط (لا تسرّب) · minor · idempotent · قصّ للمتبقّي.

function isUnique(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && (e as { code?: string }).code === "P2002");
}

// SALE: عند بيع مُسنَد مؤكّد (PAID). عملة البيع = عملة الحملة (لا تحويل).
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
          status: true,
          currency: true,
          saleEnabled: true,
          saleBudget: true,
          saleSpent: true,
          saleCreatorBps: true,
          saleFixedPerSale: true,
        },
      },
    },
  });
  if (!p) return;
  const c = p.campaign;
  // مكوّن البيع مُفعّل · الحملة نشطة · المبدع منضمّ · نفس العملة.
  if (!c.saleEnabled || c.status !== "ACTIVE" || p.status !== "ACTIVE") return;
  if (!c.currency || c.currency !== order.currency) return;

  // idempotency: مستحقّ واحد لكل طلب (orderId فريد).
  const existing = await prisma.campaignPayout.findUnique({
    where: { orderId: order.id },
    select: { id: true },
  });
  if (existing) return;

  const computed = computeSalePayout(order.amount, c.saleCreatorBps, c.saleFixedPerSale);
  const remaining = campaignRemaining(c.saleBudget, c.saleSpent);
  const amount = Math.min(computed, remaining);
  if (amount <= 0) return; // ميزانية البيع مستنفدة → لا مستحقّ يتجاوزها

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
        data: { saleSpent: { increment: amount }, spentAmount: { increment: amount } },
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
          status: true,
          currency: true,
          performanceEnabled: true,
          performanceBudget: true,
          performanceSpent: true,
          performanceCpc: true,
        },
      },
    },
  });
  if (!p) return;
  const c = p.campaign;
  if (!c.performanceEnabled || c.status !== "ACTIVE" || p.status !== "ACTIVE") return;
  if (!c.currency) return;

  const cpc = c.performanceCpc ?? 0;
  if (cpc <= 0) return;
  const remaining = campaignRemaining(c.performanceBudget, c.performanceSpent);
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
      data: { performanceSpent: { increment: amount }, spentAmount: { increment: amount } },
    }),
  ]);
}
