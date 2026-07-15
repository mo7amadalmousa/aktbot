import { prisma } from "@/lib/prisma";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_TYPE_LABEL,
} from "@/lib/attribution/labels";

// إعادة تصدير الوسوم (للصفحات الخادميّة) — المصدر في labels.ts (آمن للعميل).
export {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_TYPE_LABEL,
  PARTICIPATION_STATUS_LABEL,
} from "@/lib/attribution/labels";

export interface PerfTotals {
  clicks: number;
  conversions: number;
  sales: number;
  salesValue: number;
}
export interface ParticipationView {
  id: string;
  creatorName: string;
  username: string;
  code: string;
  link: string;
  status: string;
  clicks: number;
  conversions: number;
  sales: number;
  salesValue: number;
  payoutAccrued: number;
}
export interface CampaignComponent {
  key: "content" | "usageRights" | "sale" | "performance";
  label: string;
  budget: number | null;
  spent: number;
}
export interface CampaignView {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  type: string;
  typeLabel: string;
  currency: string;
  budgetAmount: number | null;
  spentAmount: number;
  contentEnabled: boolean;
  components: CampaignComponent[];
  participations: ParticipationView[];
  totals: PerfTotals;
}
export interface BrandOverview {
  brand: {
    id: string;
    brandName: string;
    website: string | null;
    contactEmail: string | null;
    isVerified: boolean;
  } | null;
  campaigns: CampaignView[];
  totals: PerfTotals;
}

const zero = (): PerfTotals => ({ clicks: 0, conversions: 0, sales: 0, salesValue: 0 });
const add = (a: PerfTotals, p: { clicks: number; conversions: number; sales: number; salesValue: number }) => {
  a.clicks += p.clicks;
  a.conversions += p.conversions;
  a.sales += p.sales;
  a.salesValue += p.salesValue;
};

// نظرة العلامة (ملكية عبر userId) — حملاتها + مشاركاتها + أداء مجمّع + الميزانية.
export async function getBrandOverview(userId: string): Promise<BrandOverview> {
  const brand = await prisma.brandProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      brandName: true,
      website: true,
      contactEmail: true,
      isVerified: true,
    },
  });
  if (!brand) return { brand: null, campaigns: [], totals: zero() };

  const campaigns = await prisma.campaign.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "desc" },
    include: {
      participations: {
        orderBy: { salesValue: "desc" },
        include: { creatorProfile: { select: { displayName: true, username: true } } },
      },
    },
  });

  const totals = zero();
  const views: CampaignView[] = campaigns.map((c) => {
    const cTotals = zero();
    const participations: ParticipationView[] = c.participations.map((p) => {
      add(cTotals, p);
      return {
        id: p.id,
        creatorName: p.creatorProfile.displayName,
        username: p.creatorProfile.username,
        code: p.uniqueCode,
        link: p.uniqueLink,
        status: p.status,
        clicks: p.clicks,
        conversions: p.conversions,
        sales: p.sales,
        salesValue: p.salesValue,
        payoutAccrued: p.payoutAccrued,
      };
    });
    add(totals, cTotals);
    const components: CampaignComponent[] = [];
    if (c.contentEnabled) components.push({ key: "content", label: "المحتوى", budget: c.contentBudget, spent: c.contentSpent });
    if (c.usageRightsWanted) components.push({ key: "usageRights", label: "الحقوق", budget: c.usageRightsBudget, spent: c.usageRightsSpent });
    if (c.saleEnabled) components.push({ key: "sale", label: "البيع", budget: c.saleBudget, spent: c.saleSpent });
    if (c.performanceEnabled) components.push({ key: "performance", label: "الأداء", budget: c.performanceBudget, spent: c.performanceSpent });
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      statusLabel: CAMPAIGN_STATUS_LABEL[c.status] ?? c.status,
      type: c.type,
      typeLabel: CAMPAIGN_TYPE_LABEL[c.type] ?? c.type,
      currency: c.currency ?? "USD",
      budgetAmount: c.budgetAmount,
      spentAmount: c.spentAmount,
      contentEnabled: c.contentEnabled,
      components,
      participations,
      totals: cTotals,
    };
  });

  return { brand, campaigns: views, totals };
}

export interface CreatorParticipationView {
  id: string;
  campaignId: string;
  campaignTitle: string;
  brandName: string;
  code: string;
  link: string;
  status: string;
  clicks: number;
  conversions: number;
  sales: number;
  salesValue: number;
  payoutAccrued: number;
  currency: string;
}

// مشاركات مبدع (ملكية) — أدائي في كل حملة + مستحقّي + الدعوات المعلّقة.
export async function getCreatorParticipations(
  creatorProfileId: string,
): Promise<CreatorParticipationView[]> {
  const rows = await prisma.campaignParticipation.findMany({
    where: { creatorProfileId },
    orderBy: { createdAt: "desc" },
    include: {
      campaign: {
        select: { id: true, title: true, currency: true, brand: { select: { brandName: true } } },
      },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    campaignId: p.campaign.id,
    campaignTitle: p.campaign.title,
    brandName: p.campaign.brand.brandName,
    code: p.uniqueCode,
    link: p.uniqueLink,
    status: p.status,
    clicks: p.clicks,
    conversions: p.conversions,
    sales: p.sales,
    salesValue: p.salesValue,
    payoutAccrued: p.payoutAccrued,
    currency: p.campaign.currency ?? "USD",
  }));
}

export interface AdminCampaignRow {
  id: string;
  title: string;
  brandName: string;
  type: string;
  status: string;
  currency: string;
  budgetAmount: number | null;
  spentAmount: number;
  participants: number;
  clicks: number;
  sales: number;
  salesValue: number;
}

// كل حملات المنصّة (admin) — للإشراف عبر DataTable.
export async function getPlatformCampaigns(): Promise<AdminCampaignRow[]> {
  const rows = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      brand: { select: { brandName: true } },
      participations: { select: { clicks: true, sales: true, salesValue: true } },
      _count: { select: { participations: true } },
    },
  });
  return rows.map((c) => {
    const agg = c.participations.reduce(
      (a, p) => {
        a.clicks += p.clicks;
        a.sales += p.sales;
        a.salesValue += p.salesValue;
        return a;
      },
      { clicks: 0, sales: 0, salesValue: 0 },
    );
    // إجمالي ميزانية المكوّنات (أو budgetAmount legacy إن لم تُضبط مكوّنات).
    const compBudget =
      (c.contentBudget ?? 0) + (c.usageRightsBudget ?? 0) + (c.saleBudget ?? 0) + (c.performanceBudget ?? 0);
    return {
      id: c.id,
      title: c.title,
      brandName: c.brand.brandName,
      type: c.type,
      status: c.status,
      currency: c.currency ?? "USD",
      budgetAmount: compBudget > 0 ? compBudget : c.budgetAmount,
      spentAmount: c.spentAmount,
      participants: c._count.participations,
      clicks: agg.clicks,
      sales: agg.sales,
      salesValue: agg.salesValue,
    };
  });
}
