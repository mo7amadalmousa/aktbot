import { prisma } from "@/lib/prisma";
import { runUgcSweeps, hasLiveUsageRight, anyLiveUsageRight } from "@/lib/campaign/ugc";
import {
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_TYPE_LABEL,
  USAGE_RIGHT_STATUS_LABEL,
  USAGE_SCOPE_LABEL,
  channelLabels,
} from "@/lib/campaign/labels";

// ── استعلامات UGC — مبدع/علامة/أدمن (قبول تلقائيّ + كنس الحقوق في البداية) ──

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
  startAt: string | null;
  endAt: string | null;
  isLive: boolean;
  isRenewal: boolean;
}

type UsageRightRow = {
  id: string;
  status: string;
  feeAmount: number;
  currency: string;
  durationDays: number;
  scope: string;
  channels: unknown;
  startAt: Date | null;
  endAt: Date | null;
  renewedFromId: string | null;
};

function toUsageRightView(ur: UsageRightRow): UsageRightView {
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
    startAt: ur.startAt ? ur.startAt.toISOString() : null,
    endAt: ur.endAt ? ur.endAt.toISOString() : null,
    isLive: hasLiveUsageRight(ur),
    isRenewal: Boolean(ur.renewedFromId),
  };
}

const URIGHT_SELECT = {
  id: true,
  status: true,
  feeAmount: true,
  currency: true,
  durationDays: true,
  scope: true,
  channels: true,
  startAt: true,
  endAt: true,
  renewedFromId: true,
} as const;

// ── المبدع: بيانات UGC لصفحة «حملاتي» ─────────────────────────────────
export interface CreatorCampaignMeta {
  campaignId: string;
  currency: string;
  contentEnabled: boolean;
  contentFee: number | null; // minor (contentPerItem)
  contentCount: number | null;
  usageRightsEnabled: boolean;
  usageRightsBudget: number | null;
  brief: string | null;
  requirements: string[];
  ended: boolean;
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
  contentPayout: number | null; // صافي مستحقّ المحتوى
  usageRightPayout: number | null; // مجموع صافي مستحقّات الحقوق (عبر التجديدات)
  currency: string;
  usageRights: UsageRightView[]; // السلسلة (الأحدث أوّلاً)
  currentUsageRight: UsageRightView | null;
}

export interface CreatorUgcData {
  metaByCampaign: Record<string, CreatorCampaignMeta>;
  submissionsByParticipation: Record<string, UgcSubmissionView[]>;
}

export async function getCreatorUgcData(creatorProfileId: string): Promise<CreatorUgcData> {
  await runUgcSweeps();

  const parts = await prisma.campaignParticipation.findMany({
    where: { creatorProfileId },
    select: {
      id: true,
      campaign: {
        select: {
          id: true,
          currency: true,
          contentEnabled: true,
          contentPerItem: true,
          contentCount: true,
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
    const reqItems =
      ((c.requirements as { items?: unknown[] } | null)?.items as unknown[] | undefined) ?? [];
    metaByCampaign[c.id] = {
      campaignId: c.id,
      currency: c.currency ?? "USD",
      contentEnabled: c.contentEnabled,
      contentFee: c.contentPerItem,
      contentCount: c.contentCount,
      usageRightsEnabled: c.usageRightsWanted,
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
      usageRights: { orderBy: { createdAt: "desc" }, select: URIGHT_SELECT },
      payouts: { select: { type: true, amount: true } },
      campaign: { select: { currency: true } },
    },
  });

  const submissionsByParticipation: Record<string, UgcSubmissionView[]> = {};
  for (const s of subs) {
    const rights = s.usageRights.map(toUsageRightView);
    const urPayout = s.payouts
      .filter((p) => p.type === "USAGE_RIGHTS")
      .reduce((a, p) => a + p.amount, 0);
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
      contentPayout: s.payouts.find((p) => p.type === "CONTENT")?.amount ?? null,
      usageRightPayout: urPayout > 0 ? urPayout : null,
      currency: s.campaign.currency ?? "USD",
      usageRights: rights,
      currentUsageRight: rights[0] ?? null,
    };
    (submissionsByParticipation[s.participationId] ??= []).push(view);
  }

  return { metaByCampaign, submissionsByParticipation };
}

// ── العلامة: تسليمات حملاتها (معاينة · مراجعة · حقوق · تجديد · أداء) ────
export interface BrandSubmissionView {
  id: string;
  campaignId: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  caption: string | null;
  reviewNote: string | null;
  revisionCount: number;
  createdAt: string;
  creatorName: string;
  username: string;
  contentUrl: string;
  downloadUrl: string;
  canDownload: boolean;
  currency: string;
  contentPayout: number | null;
  usageRightPayout: number | null;
  usageRights: UsageRightView[];
  currentUsageRight: UsageRightView | null;
  // أداء المبدع في الحملة (إسناد) — «هذا المحتوى/المبدع جلب X».
  perfSales: number;
  perfSalesValue: number;
}

export async function getBrandUgcSubmissions(
  brandProfileId: string,
): Promise<Record<string, BrandSubmissionView[]>> {
  await runUgcSweeps();
  const subs = await prisma.contentSubmission.findMany({
    where: { campaign: { brandId: brandProfileId } },
    orderBy: { createdAt: "desc" },
    include: {
      creatorProfile: { select: { displayName: true, username: true } },
      usageRights: { orderBy: { createdAt: "desc" }, select: URIGHT_SELECT },
      payouts: { select: { type: true, amount: true } },
      campaign: { select: { currency: true } },
      participation: { select: { sales: true, salesValue: true } },
    },
  });

  const byCampaign: Record<string, BrandSubmissionView[]> = {};
  for (const s of subs) {
    const rights = s.usageRights.map(toUsageRightView);
    const urPayout = s.payouts
      .filter((p) => p.type === "USAGE_RIGHTS")
      .reduce((a, p) => a + p.amount, 0);
    const view: BrandSubmissionView = {
      id: s.id,
      campaignId: s.campaignId,
      type: s.type,
      typeLabel: SUBMISSION_TYPE_LABEL[s.type] ?? s.type,
      status: s.status,
      statusLabel: SUBMISSION_STATUS_LABEL[s.status] ?? s.status,
      caption: s.caption,
      reviewNote: s.reviewNote,
      revisionCount: s.revisionCount,
      createdAt: s.createdAt.toISOString(),
      creatorName: s.creatorProfile.displayName,
      username: s.creatorProfile.username,
      contentUrl: contentUrl(s.id),
      downloadUrl: `${contentUrl(s.id)}?download=1`,
      canDownload: anyLiveUsageRight(s.usageRights),
      currency: s.campaign.currency ?? "USD",
      contentPayout: s.payouts.find((p) => p.type === "CONTENT")?.amount ?? null,
      usageRightPayout: urPayout > 0 ? urPayout : null,
      usageRights: rights,
      currentUsageRight: rights[0] ?? null,
      perfSales: s.participation.sales,
      perfSalesValue: s.participation.salesValue,
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
  await runUgcSweeps();
  const subs = await prisma.contentSubmission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { title: true, currency: true, brand: { select: { brandName: true } } } },
      creatorProfile: { select: { displayName: true } },
      usageRights: { orderBy: { createdAt: "desc" }, select: { status: true, feeAmount: true } },
      payouts: { select: { type: true, amount: true } },
    },
  });
  return subs.map((s) => {
    const latest = s.usageRights[0] ?? null;
    const usageNet = s.payouts
      .filter((p) => p.type === "USAGE_RIGHTS")
      .reduce((a, p) => a + p.amount, 0);
    return {
      id: s.id,
      campaignTitle: s.campaign.title,
      brandName: s.campaign.brand.brandName,
      creatorName: s.creatorProfile.displayName,
      type: s.type,
      typeLabel: SUBMISSION_TYPE_LABEL[s.type] ?? s.type,
      status: s.status,
      statusLabel: SUBMISSION_STATUS_LABEL[s.status] ?? s.status,
      usageStatus: latest?.status ?? "NOT_REQUESTED",
      usageStatusLabel: USAGE_RIGHT_STATUS_LABEL[latest?.status ?? "NOT_REQUESTED"],
      usageFee: latest?.feeAmount ?? null,
      contentNet: s.payouts.find((p) => p.type === "CONTENT")?.amount ?? null,
      usageNet: usageNet > 0 ? usageNet : null,
      currency: s.campaign.currency ?? "USD",
      createdAt: s.createdAt.toISOString(),
    };
  });
}
