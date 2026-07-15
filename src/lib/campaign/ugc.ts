import { prisma } from "@/lib/prisma";
import { asRecord } from "@/lib/public/block-config";
import { campaignRemaining } from "@/lib/campaign/config";
import {
  resolveRule,
  computeCommission,
  type RuleRow,
  type ComputedCommission,
} from "@/lib/commission/engine";
import { SUPPORTED_CURRENCIES } from "@/lib/payments/money";
import type { SaleType } from "@/generated/prisma/enums";

// ── محرّك UGC: مستحقّ المحتوى + حقوق الاستخدام (+ تجديد) + عمولة المنصّة ──
// كل مستحقّ من ميزانية مكوّنه (لا تسرّب) · minor · idempotent · قصّ للميزانية.

function isUnique(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && (e as { code?: string }).code === "P2002");
}

export const REVIEW_DEADLINE_DAYS = Number(process.env.UGC_REVIEW_DAYS) || 5;
export const EXPIRING_SOON_DAYS = Number(process.env.UGC_EXPIRING_SOON_DAYS) || 7;

// ── الحدّ الأدنى لأجر الحقوق (إعداد منصّة per-currency) — يضمن العمولة ──
const MIN_FEE_KEY = "usage_rights_min_fee";

export function defaultMinUsageFee(currency: string): number {
  const factor = SUPPORTED_CURRENCIES[currency]?.minorFactor ?? 100;
  return 5 * factor; // 5 وحدات أساس → يضمن عمولة > 0
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

// ── عمولة المنصّة على أجر حملة (المحتوى/الحقوق) — عبر المحرّك الهرميّ ────
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

// ── قبول محتوى (يدويّ أو تلقائيّ) → مستحقّ محتوى + عمولة + خصم ميزانية المحتوى ──
export async function accrueContentPayout(submissionId: string): Promise<void> {
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
          currency: true,
          brandId: true,
          contentEnabled: true,
          contentBudget: true,
          contentSpent: true,
          contentPerItem: true,
        },
      },
    },
  });
  if (!sub) return;
  if (sub.status !== "APPROVED" && sub.status !== "AUTO_APPROVED") return;
  const c = sub.campaign;
  if (!c.contentEnabled || !c.currency) return;

  // idempotency: مستحقّ محتوى واحد لكل تسليم.
  const existing = await prisma.campaignPayout.findFirst({
    where: { submissionId, type: "CONTENT" },
    select: { id: true },
  });
  if (existing) return;

  const per = c.contentPerItem ?? 0;
  if (per <= 0) return;
  const remaining = campaignRemaining(c.contentBudget, c.contentSpent);
  const gross = Math.min(per, remaining);
  if (gross <= 0) return; // ميزانية المحتوى مستنفدة → لا مستحقّ (قصّ كنمط SALE)

  const comm = await campaignCommission(gross, "CONTENT", {
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
          type: "CONTENT",
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
        data: { contentSpent: { increment: gross }, spentAmount: { increment: gross } },
      });
      await tx.commissionLedger.create({
        data: {
          campaignPayoutId: payout.id,
          creatorProfileId: sub.creatorProfileId,
          brandId: c.brandId,
          campaignId: c.id,
          saleType: "CONTENT",
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
    if (!isUnique(e)) throw e;
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
      // حارس السباق: يُقبَل فقط إن كان لا يزال REQUESTED → ACTIVE (سارٍ).
      const upd = await tx.usageRight.updateMany({
        where: { id: ur.id, status: "REQUESTED" },
        data: { status: "ACTIVE", respondedAt: now, startAt: now, endAt },
      });
      if (upd.count === 0) return;
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
          usageRightId: ur.id, // idempotency لكل حقّ (يسمح بتجديدات متعدّدة)
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
        data: { usageRightsSpent: { increment: gross }, spentAmount: { increment: gross } },
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
    if (!isUnique(e)) throw e;
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

// ── كنس كسول: قبول تلقائيّ للمتأخّر + تحديث حالات الحقوق (لا cron الآن) ──
export async function autoApproveOverdue(): Promise<void> {
  const overdue = await prisma.contentSubmission.findMany({
    where: { status: "SUBMITTED", reviewDeadlineAt: { lt: new Date() } },
    select: { id: true },
  });
  for (const s of overdue) {
    const upd = await prisma.contentSubmission.updateMany({
      where: { id: s.id, status: "SUBMITTED" },
      data: { status: "AUTO_APPROVED", reviewedAt: new Date() },
    });
    if (upd.count > 0) await accrueContentPayout(s.id);
  }
}

export async function sweepUsageRights(): Promise<void> {
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRING_SOON_DAYS * 86400000);
  // قربت النهاية → EXPIRING_SOON (نافذة تنبيه التجديد).
  await prisma.usageRight
    .updateMany({
      where: { status: { in: ["ACTIVE", "ACCEPTED"] }, endAt: { gte: now, lte: soon } },
      data: { status: "EXPIRING_SOON" },
    })
    .catch(() => {});
  // انتهت المدّة → EXPIRED.
  await prisma.usageRight
    .updateMany({
      where: { status: { in: ["ACTIVE", "ACCEPTED", "EXPIRING_SOON"] }, endAt: { lt: now } },
      data: { status: "EXPIRED" },
    })
    .catch(() => {});
}

// يُستدعى في بداية استعلامات المحتوى (مبدع/علامة/أدمن) — قبول تلقائيّ + كنس الحقوق.
export async function runUgcSweeps(): Promise<void> {
  await autoApproveOverdue();
  await sweepUsageRights();
}

// حالات الحقّ «الحيّ» (يُتيح التنزيل الإعلانيّ). ACCEPTED legacy مدعوم.
const LIVE_STATUSES = new Set(["ACTIVE", "ACCEPTED", "EXPIRING_SOON"]);

export function hasLiveUsageRight(ur: { status: string; endAt: Date | null } | null): boolean {
  if (!ur) return false;
  if (!LIVE_STATUSES.has(ur.status)) return false;
  if (ur.endAt && ur.endAt.getTime() < Date.now()) return false;
  return true;
}

// هل لأيّ حقّ في القائمة حالة حيّة؟ (تنزيل العلامة يتطلّب حقّاً حيّاً واحداً على الأقلّ.)
export function anyLiveUsageRight(rights: { status: string; endAt: Date | null }[]): boolean {
  return rights.some((r) => hasLiveUsageRight(r));
}
