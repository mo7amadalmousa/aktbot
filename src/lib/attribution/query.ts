import { prisma } from "@/lib/prisma";

export const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "مسودّة",
  ACTIVE: "نشطة",
  PAUSED: "موقوفة",
  ENDED: "منتهية",
};
export const CAMPAIGN_TYPE_LABEL: Record<string, string> = {
  SALE: "مبيعات",
  PERFORMANCE: "أداء",
  UGC: "محتوى (UGC)",
};

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
}
export interface CampaignView {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  type: string;
  typeLabel: string;
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

// نظرة العلامة (ملكية عبر userId) — حملاتها + مشاركاتها + أداء مجمّع.
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
      };
    });
    add(totals, cTotals);
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      statusLabel: CAMPAIGN_STATUS_LABEL[c.status] ?? c.status,
      type: c.type,
      typeLabel: CAMPAIGN_TYPE_LABEL[c.type] ?? c.type,
      participations,
      totals: cTotals,
    };
  });

  return { brand, campaigns: views, totals };
}

export interface CreatorParticipationView {
  campaignTitle: string;
  brandName: string;
  code: string;
  link: string;
  status: string;
  clicks: number;
  conversions: number;
  sales: number;
  salesValue: number;
}

// مشاركات مبدع (ملكية) — أدائي في كل حملة.
export async function getCreatorParticipations(
  creatorProfileId: string,
): Promise<CreatorParticipationView[]> {
  const rows = await prisma.campaignParticipation.findMany({
    where: { creatorProfileId },
    orderBy: { createdAt: "desc" },
    include: {
      campaign: {
        select: { title: true, brand: { select: { brandName: true } } },
      },
    },
  });
  return rows.map((p) => ({
    campaignTitle: p.campaign.title,
    brandName: p.campaign.brand.brandName,
    code: p.uniqueCode,
    link: p.uniqueLink,
    status: p.status,
    clicks: p.clicks,
    conversions: p.conversions,
    sales: p.sales,
    salesValue: p.salesValue,
  }));
}
