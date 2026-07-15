import { prisma } from "@/lib/prisma";
import { asRecord } from "@/lib/public/block-config";
import type { PayoutConfig } from "@/lib/campaign/config";
import { expireUsageRights, hasLiveUsageRight } from "@/lib/campaign/ugc";
import {
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_TYPE_LABEL,
  USAGE_RIGHT_STATUS_LABEL,
  USAGE_SCOPE_LABEL,
  channelLabels,
} from "@/lib/campaign/labels";

// ── استعلامات UGC — مبدع/علامة/أدمن (كنس الانتهاء الكسول في البداية) ───

const contentUrl = (id: string) => `/api/campaign/submissions/${id}/content`;

export interface UsageRightView {
  id: string;
  status: string;
  statusLabel: string;
  feeAmount: number;
  currency: string;
  durationDays: number;
  scope: string;
  scopeLabel: string;
  channels: string[];
  endAt: string | null;
}
export interface UgcSubmissionView {
  id: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  caption: string | null;
  reviewNote: string | null;
  createdAt: string;
  contentUrl: string;
  contentPayout: number | null; // صافي مستحقّ المحتوى (UGC)
  usageRightPayout: number | null; // صافي مستحقّ الحقوق
  currency: string;
  usageRight: UsageRightView | null;
}

function toUsageRightView(ur: {
  id: string;
  status: string;
  feeAmount: number;
  currency: string;
  durationDays: number;
  scope: string;
  channels: unknown;
  endAt: Date | null;
} | null): UsageRightView | null {
  if (!ur) return null;
  return {
    id: ur.id,
    status: ur.status,
    statusLabel: USAGE_RIGHT_STATUS_LABEL[ur.status] ?? ur.status,
    feeAmount: ur.feeAmount,
    currency: ur.currency,
    durationDays: ur.durationDays,
    scope: ur.scope,
    scopeLabel: USAGE_SCOPE_LABEL[ur.scope] ?? ur.scope,
    channels: channelLabels(ur.channels),
    endAt: ur.endAt ? ur.endAt.toISOString() : null,
  };
}

// ── المبدع: بيانات UGC لصفحة «حملاتي» (شفافية + تسليمات + حقوق) ─────────
export interface CreatorCampaignMeta {
  campaignId: string;
  type: string;
  currency: string;
  contentFee: number | null; // minor (fixedPerContent)
  usageRightsWanted: boolean;
  usageRightsBudget: number | null;
  brief: string | null;
  requirements: string[];
  ended: boolean;
}

export interface CreatorUgcData {
  metaByCampaign: Record<string, CreatorCampaignMeta>;
  submissionsByParticipation: Record<string, UgcSubmissionView[]>;
}

export async function getCreatorUgcData(creatorProfileId: string): Promise<CreatorUgcData> {
  await expireUsageRights();

  const parts = await prisma.campaignParticipation.findMany({
    where: { creatorProfileId },
    select: {
      id: true,
      campaign: {
        select: {
          id: true,
          type: true,
          currency: true,
          payoutConfig: true,
          usageRightsWanted: true,
          usageRightsBudget: true,
          brief: true,
          requirements: true,
          endAt: true,
        },
      },
    },
  });

  const metaByCampaign: Record<string, CreatorCampaignMeta> = {};
  for (const p of parts) {
    const c = p.campaign;
    if (metaByCampaign[c.id]) continue;
    const cfg = asRecord(c.payoutConfig) as PayoutConfig;
    const reqItems = (asRecord(c.requirements).items as unknown[] | undefined) ?? [];
    metaByCampaign[c.id] = {
      campaignId: c.id,
      type: c.type,
      currency: c.currency ?? "USD",
      contentFee: typeof cfg.fixedPerContent === "number" ? cfg.fixedPerContent : null,
      usageRightsWanted: c.usageRightsWanted,
      usageRightsBudget: c.usageRightsBudget,
      brief: c.brief,
      requirements: reqItems.map((x) => String(x)).filter(Boolean),
      ended: Boolean(c.endAt && c.endAt.getTime() < Date.now()),
    };
  }

  const subs = await prisma.contentSubmission.findMany({
    where: { creatorProfileId },
    orderBy: { createdAt: "desc" },
    include: {
      usageRight: true,
      payouts: { select: { type: true, amount: true } },
      campaign: { select: { currency: true } },
    },
  });

  const submissionsByParticipation: Record<string, UgcSubmissionView[]> = {};
  for (const s of subs) {
    const ugcPayout = s.payouts.find((p) => p.type === "UGC")?.amount ?? null;
    const urPayout = s.payouts.find((p) => p.type === "USAGE_RIGHTS")?.amount ?? null;
    const view: UgcSubmissionView = {
      id: s.id,
      type: s.type,
      typeLabel: SUBMISSION_TYPE_LABEL[s.type] ?? s.type,
      status: s.status,
      statusLabel: SUBMISSION_STATUS_LABEL[s.status] ?? s.status,
      caption: s.caption,
      reviewNote: s.reviewNote,
      createdAt: s.createdAt.toISOString(),
      contentUrl: contentUrl(s.id),
      contentPayout: ugcPayout,
      usageRightPayout: urPayout,
      currency: s.campaign.currency ?? "USD",
      usageRight: toUsageRightView(s.usageRight),
    };
    (submissionsByParticipation[s.participationId] ??= []).push(view);
  }

  return { metaByCampaign, submissionsByParticipation };
}

// ── العلامة: تسليمات حملاتها (معاينة محميّة + مراجعة + حقوق) ────────────
export interface BrandSubmissionView {
  id: string;
  campaignId: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  caption: string | null;
  reviewNote: string | null;
  createdAt: string;
  creatorName: string;
  username: string;
  contentUrl: string;
  downloadUrl: string;
  canDownload: boolean;
  currency: string;
  contentPayout: number | null;
  usageRightPayout: number | null;
  usageRight: UsageRightView | null;
}

export async function getBrandUgcSubmissions(
  brandProfileId: string,
): Promise<Record<string, BrandSubmissionView[]>> {
  await expireUsageRights();
  const subs = await prisma.contentSubmission.findMany({
    where: { campaign: { brandId: brandProfileId } },
    orderBy: { createdAt: "desc" },
    include: {
      creatorProfile: { select: { displayName: true, username: true } },
      usageRight: true,
      payouts: { select: { type: true, amount: true } },
      campaign: { select: { currency: true } },
    },
  });

  const byCampaign: Record<string, BrandSubmissionView[]> = {};
  for (const s of subs) {
    const view: BrandSubmissionView = {
      id: s.id,
      campaignId: s.campaignId,
      type: s.type,
      typeLabel: SUBMISSION_TYPE_LABEL[s.type] ?? s.type,
      status: s.status,
      statusLabel: SUBMISSION_STATUS_LABEL[s.status] ?? s.status,
      caption: s.caption,
      reviewNote: s.reviewNote,
      createdAt: s.createdAt.toISOString(),
      creatorName: s.creatorProfile.displayName,
      username: s.creatorProfile.username,
      contentUrl: contentUrl(s.id),
      downloadUrl: `${contentUrl(s.id)}?download=1`,
      canDownload: hasLiveUsageRight(s.usageRight),
      currency: s.campaign.currency ?? "USD",
      contentPayout: s.payouts.find((p) => p.type === "UGC")?.amount ?? null,
      usageRightPayout: s.payouts.find((p) => p.type === "USAGE_RIGHTS")?.amount ?? null,
      usageRight: toUsageRightView(s.usageRight),
    };
    (byCampaign[s.campaignId] ??= []).push(view);
  }
  return byCampaign;
}

// ── الأدمن: إشراف التسليمات/الحقوق عبر المنصّة (DataTable) ──────────────
export interface AdminSubmissionRow {
  id: string;
  campaignTitle: string;
  brandName: string;
  creatorName: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  usageStatus: string;
  usageStatusLabel: string;
  usageFee: number | null;
  contentNet: number | null;
  usageNet: number | null;
  currency: string;
  createdAt: string;
}

export async function getPlatformUgc(): Promise<AdminSubmissionRow[]> {
  await expireUsageRights();
  const subs = await prisma.contentSubmission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { title: true, currency: true, brand: { select: { brandName: true } } } },
      creatorProfile: { select: { displayName: true } },
      usageRight: { select: { status: true, feeAmount: true } },
      payouts: { select: { type: true, amount: true } },
    },
  });
  return subs.map((s) => ({
    id: s.id,
    campaignTitle: s.campaign.title,
    brandName: s.campaign.brand.brandName,
    creatorName: s.creatorProfile.displayName,
    type: s.type,
    typeLabel: SUBMISSION_TYPE_LABEL[s.type] ?? s.type,
    status: s.status,
    statusLabel: SUBMISSION_STATUS_LABEL[s.status] ?? s.status,
    usageStatus: s.usageRight?.status ?? "NOT_REQUESTED",
    usageStatusLabel: USAGE_RIGHT_STATUS_LABEL[s.usageRight?.status ?? "NOT_REQUESTED"],
    usageFee: s.usageRight?.feeAmount ?? null,
    contentNet: s.payouts.find((p) => p.type === "UGC")?.amount ?? null,
    usageNet: s.payouts.find((p) => p.type === "USAGE_RIGHTS")?.amount ?? null,
    currency: s.campaign.currency ?? "USD",
    createdAt: s.createdAt.toISOString(),
  }));
}
