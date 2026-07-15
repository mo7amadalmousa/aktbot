import { prisma } from "@/lib/prisma";
import { asRecord } from "@/lib/public/block-config";
import { campaignRemaining, type PayoutConfig } from "@/lib/campaign/config";
import {
  resolveRule,
  computeCommission,
  type RuleRow,
  type ComputedCommission,
} from "@/lib/commission/engine";
import { SUPPORTED_CURRENCIES } from "@/lib/payments/money";
import type { SaleType } from "@/generated/prisma/enums";

// ── محرّك UGC: مستحقّ المحتوى + حقوق الاستخدام + عمولة المنصّة ──────────
// مصدر الحقيقة للمستحقّ = CampaignPayout · لعمولة المنصّة = CommissionLedger.
// كلّها minor int · idempotent · لا تتجاوز الميزانية (قصّ كنمط SALE).

function isUnique(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && (e as { code?: string }).code === "P2002");
}

// ── الحدّ الأدنى لأجر الحقوق (إعداد منصّة per-currency) — يضمن العمولة ──
const MIN_FEE_KEY = "usage_rights_min_fee";

// افتراضيّ: 5 وحدات أساس من العملة (بمعاملها) — يضمن عمولة > 0.
export function defaultMinUsageFee(currency: string): number {
  const factor = SUPPORTED_CURRENCIES[currency]?.minorFactor ?? 100;
  return 5 * factor;
}

export async function getMinUsageFees(): Promise<Record<string, number>> {
  const row = await prisma.platformSetting.findUnique({ where: { key: MIN_FEE_KEY } });
  if (!row) return {};
  const obj = asRecord(row.value);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = Math.round(v);
  }
  return out;
}

// الحدّ الأدنى الفعليّ لعملة (المُخزَّن أو الافتراضيّ).
export async function minUsageFee(currency: string): Promise<number> {
  const fees = await getMinUsageFees();
  const v = fees[currency];
  return typeof v === "number" && v > 0 ? v : defaultMinUsageFee(currency);
}

export async function setMinUsageFees(map: Record<string, number>): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key: MIN_FEE_KEY },
    update: { value: map },
    create: { key: MIN_FEE_KEY, value: map },
  });
}

// ── عمولة المنصّة على أجر حملة (UGC/الحقوق) — عبر المحرّك الهرميّ ───────
async function campaignCommission(
  gross: number,
  saleType: SaleType,
  ctx: { creatorProfileId: string; brandId: string | null; campaignId: string | null },
): Promise<ComputedCommission> {
  const rules = await prisma.commissionRule.findMany({ where: { isActive: true } });
  const rule = resolveRule(rules as RuleRow[], {
    saleType,
    creatorProfileId: ctx.creatorProfileId,
    brandId: ctx.brandId,
    campaignId: ctx.campaignId,
    now: new Date(),
  });
  return computeCommission(gross, rule);
}

// ── قبول تسليم UGC → مستحقّ محتوى + عمولة + خصم ميزانية (idempotent) ───
// يُستدعى عند قبول العلامة. gross = fixedPerContent مقصوصاً لمتبقّي الميزانية.
export async function accrueUgcContentPayout(submissionId: string): Promise<void> {
  const sub = await prisma.contentSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      status: true,
      creatorProfileId: true,
      participationId: true,
      campaign: {
        select: {
          id: true,
          type: true,
          currency: true,
          brandId: true,
          budgetAmount: true,
          spentAmount: true,
          payoutConfig: true,
        },
      },
    },
  });
  if (!sub) return;
  const c = sub.campaign;
  if (c.type !== "UGC" || !c.currency) return;

  // idempotency: مستحقّ UGC واحد لكل تسليم.
  const existing = await prisma.campaignPayout.findFirst({
    where: { submissionId, type: "UGC" },
    select: { id: true },
  });
  if (existing) return;

  const fpc = (asRecord(c.payoutConfig) as PayoutConfig).fixedPerContent ?? 0;
  if (fpc <= 0) return;
  const remaining = campaignRemaining(c.budgetAmount, c.spentAmount);
  const gross = Math.min(fpc, remaining);
  if (gross <= 0) return; // ميزانية مستنفدة → لا مستحقّ (قصّ كنمط SALE)

  const comm = await campaignCommission(gross, "CAMPAIGN", {
    creatorProfileId: sub.creatorProfileId,
    brandId: c.brandId,
    campaignId: c.id,
  });
  const net = comm.netCreatorAmount;

  try {
    await prisma.$transaction(async (tx) => {
      const payout = await tx.campaignPayout.create({
        data: {
          campaignId: c.id,
          participationId: sub.participationId,
          creatorProfileId: sub.creatorProfileId,
          type: "UGC",
          amount: net,
          grossAmount: gross,
          commissionAmount: comm.commissionAmount,
          currency: c.currency!,
          submissionId,
          status: "APPROVED",
        },
        select: { id: true },
      });
      await tx.campaignParticipation.update({
        where: { id: sub.participationId },
        data: { payoutAccrued: { increment: net } },
      });
      await tx.campaign.update({
        where: { id: c.id },
        data: { spentAmount: { increment: gross } },
      });
      await tx.commissionLedger.create({
        data: {
          campaignPayoutId: payout.id,
          creatorProfileId: sub.creatorProfileId,
          brandId: c.brandId,
          campaignId: c.id,
          saleType: "CAMPAIGN",
          grossAmount: gross,
          commissionAmount: comm.commissionAmount,
          netCreatorAmount: net,
          appliedRuleId: comm.appliedRuleId,
          currency: c.currency!,
          status: "ACCRUED",
        },
      });
    });
  } catch (e) {
    if (!isUnique(e)) throw e; // سباق → مستحقّ واحد
  }
}

// ── قبول المبدع لحقّ استخدام → مستحقّ حقوق + عمولة + خصم ميزانية الحقوق ──
export async function acceptUsageRight(
  usageRightId: string,
  creatorProfileId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ur = await prisma.usageRight.findUnique({
    where: { id: usageRightId },
    select: {
      id: true,
      status: true,
      feeAmount: true,
      currency: true,
      durationDays: true,
      submission: {
        select: {
          id: true,
          creatorProfileId: true,
          participationId: true,
          campaign: {
            select: {
              id: true,
              brandId: true,
              currency: true,
              usageRightsBudget: true,
              usageRightsSpent: true,
            },
          },
        },
      },
    },
  });
  if (!ur || ur.submission.creatorProfileId !== creatorProfileId) {
    return { ok: false, error: "not_found" };
  }
  if (ur.status !== "REQUESTED") return { ok: true }; // idempotent (سبق الردّ)

  const c = ur.submission.campaign;
  const currency = ur.currency || c.currency || "USD";
  const remaining = campaignRemaining(c.usageRightsBudget, c.usageRightsSpent);
  const gross = Math.min(ur.feeAmount, remaining); // قصّ لميزانية الحقوق (كنمط SALE)
  const now = new Date();
  const endAt = new Date(now.getTime() + ur.durationDays * 86400000);

  const comm =
    gross > 0
      ? await campaignCommission(gross, "USAGE_RIGHTS", {
          creatorProfileId,
          brandId: c.brandId,
          campaignId: c.id,
        })
      : null;
  const net = comm ? comm.netCreatorAmount : 0;

  try {
    await prisma.$transaction(async (tx) => {
      // حارس السباق: يُقبَل فقط إن كان لا يزال REQUESTED.
      const upd = await tx.usageRight.updateMany({
        where: { id: ur.id, status: "REQUESTED" },
        data: { status: "ACCEPTED", respondedAt: now, startAt: now, endAt },
      });
      if (upd.count === 0) return; // سبق الردّ (سباق)
      if (gross <= 0 || !comm) return; // ميزانية الحقوق مستنفدة → قبول بلا مستحقّ

      const payout = await tx.campaignPayout.create({
        data: {
          campaignId: c.id,
          participationId: ur.submission.participationId,
          creatorProfileId,
          type: "USAGE_RIGHTS",
          amount: net,
          grossAmount: gross,
          commissionAmount: comm.commissionAmount,
          currency,
          submissionId: ur.submission.id,
          status: "ACCRUED",
        },
        select: { id: true },
      });
      await tx.campaignParticipation.update({
        where: { id: ur.submission.participationId },
        data: { payoutAccrued: { increment: net } },
      });
      await tx.campaign.update({
        where: { id: c.id },
        data: { usageRightsSpent: { increment: gross } },
      });
      await tx.commissionLedger.create({
        data: {
          campaignPayoutId: payout.id,
          creatorProfileId,
          brandId: c.brandId,
          campaignId: c.id,
          saleType: "USAGE_RIGHTS",
          grossAmount: gross,
          commissionAmount: comm.commissionAmount,
          netCreatorAmount: net,
          appliedRuleId: comm.appliedRuleId,
          currency,
          status: "ACCRUED",
        },
      });
    });
  } catch (e) {
    if (!isUnique(e)) throw e; // سباق → مستحقّ واحد
  }
  return { ok: true };
}

// رفض المبدع لحقّ استخدام (لا مستحقّ · المحتوى يبقى للحملة فقط).
export async function declineUsageRight(
  usageRightId: string,
  creatorProfileId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ur = await prisma.usageRight.findUnique({
    where: { id: usageRightId },
    select: { id: true, status: true, submission: { select: { creatorProfileId: true } } },
  });
  if (!ur || ur.submission.creatorProfileId !== creatorProfileId) {
    return { ok: false, error: "not_found" };
  }
  if (ur.status !== "REQUESTED") return { ok: true };
  await prisma.usageRight.updateMany({
    where: { id: ur.id, status: "REQUESTED" },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
  return { ok: true };
}

// كنس كسول: تحويل الحقوق المنتهية مدّتها إلى EXPIRED (فلترة بالوقت — لا cron).
// يُستدعى في بداية استعلامات المحتوى (مبدع/علامة/أدمن).
export async function expireUsageRights(): Promise<void> {
  await prisma.usageRight
    .updateMany({
      where: { status: "ACCEPTED", endAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    })
    .catch(() => {});
}

// هل للتسليم حقّ استخدام سارٍ (مقبول وغير منتهٍ)؟ — شرط التنزيل الإعلانيّ للعلامة.
export function hasLiveUsageRight(ur: {
  status: string;
  endAt: Date | null;
} | null): boolean {
  if (!ur) return false;
  if (ur.status !== "ACCEPTED") return false;
  if (ur.endAt && ur.endAt.getTime() < Date.now()) return false;
  return true;
}
