import { prisma } from "@/lib/prisma";
import { asRecord, str } from "@/lib/public/block-config";
import { lastNDates, todayUTC } from "@/lib/analytics/track";

// وسم بشريّ مختصر للبلوك (لعرض «أكثر البلوكات نقراً»).
export function blockLabel(type: string, config: unknown): string {
  const c = asRecord(config);
  const t = str(c.title);
  switch (type) {
    case "LINK":
      return str(c.label) || "رابط";
    case "CONSULTATION":
      return t || "استشارة";
    case "PAID_VIDEO":
      return t || "فيديو خاص";
    case "STORE":
      return t || "المتجر";
    case "NEWSLETTER":
      return t || "النشرة";
    case "DISCOUNT":
      return t || "الخصومات";
    case "SOCIAL":
      return "التواصل";
    case "QR":
      return t || "QR";
    case "GALLERY":
      return t || "المعرض";
    case "EMBED":
      return t || "تضمين";
    case "FORM":
      return t || "نموذج";
    case "BEFORE_AFTER":
      return "قبل/بعد";
    case "STORY":
      return t || "ستوري";
    default:
      return t || type;
  }
}

const TYPE_LABEL: Record<string, string> = {
  LINK: "رابط",
  CONSULTATION: "استشارة",
  PAID_VIDEO: "فيديو",
  STORE: "متجر",
  NEWSLETTER: "نشرة",
  DISCOUNT: "خصومات",
  SOCIAL: "تواصل",
  QR: "QR",
  GALLERY: "معرض",
  EMBED: "تضمين",
  FORM: "نموذج",
  BEFORE_AFTER: "قبل/بعد",
  STORY: "ستوري",
};

export interface DayPoint {
  date: string;
  views: number;
  uniques: number;
}
export interface CreatorAnalytics {
  today: number;
  todayUniques: number;
  last7: number;
  last7Uniques: number;
  last30: number;
  last30Uniques: number;
  series: DayPoint[]; // آخر 30 يوماً (مملوءة)
  sources: { direct: number; social: number; other: number };
  topBlocks: { blockId: string; label: string; type: string; count: number }[];
  followerCount: number;
}

// تحليلات مبدع واحد — كلّها من عدّادات مجمّعة/مفهرسة (لا مسح صفوف ضخمة).
export async function getCreatorAnalytics(
  creatorProfileId: string,
): Promise<CreatorAnalytics> {
  const dates = lastNDates(30);
  const rows = await prisma.pageViewDaily.findMany({
    where: { creatorProfileId, date: { in: dates } },
    select: {
      date: true,
      views: true,
      uniques: true,
      srcDirect: true,
      srcSocial: true,
      srcOther: true,
    },
  });
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const series: DayPoint[] = dates.map((d) => ({
    date: d,
    views: byDate.get(d)?.views ?? 0,
    uniques: byDate.get(d)?.uniques ?? 0,
  }));

  const tail = (n: number, key: "views" | "uniques") =>
    series.slice(-n).reduce((s, p) => s + p[key], 0);

  const today = byDate.get(todayUTC());
  const sources = rows.reduce(
    (acc, r) => {
      acc.direct += r.srcDirect;
      acc.social += r.srcSocial;
      acc.other += r.srcOther;
      return acc;
    },
    { direct: 0, social: 0, other: 0 },
  );

  const clicks = await prisma.blockClick.findMany({
    where: { creatorProfileId },
    orderBy: { count: "desc" },
    take: 8,
  });
  const blockIds = clicks.map((c) => c.blockId);
  const blocks = blockIds.length
    ? await prisma.block.findMany({
        where: { id: { in: blockIds } },
        select: { id: true, type: true, config: true },
      })
    : [];
  const blockMap = new Map(blocks.map((b) => [b.id, b]));
  const topBlocks = clicks
    .map((c) => {
      const b = blockMap.get(c.blockId);
      if (!b) return null; // بلوك محذوف
      return {
        blockId: c.blockId,
        label: blockLabel(b.type, b.config),
        type: TYPE_LABEL[b.type] ?? b.type,
        count: c.count,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorProfileId },
    select: { followerCount: true },
  });

  return {
    today: today?.views ?? 0,
    todayUniques: today?.uniques ?? 0,
    last7: tail(7, "views"),
    last7Uniques: tail(7, "uniques"),
    last30: tail(30, "views"),
    last30Uniques: tail(30, "uniques"),
    series,
    sources,
    topBlocks,
    followerCount: profile?.followerCount ?? 0,
  };
}

export interface PlatformAnalytics {
  creators: number;
  published: number;
  totalViews: number;
  totalUniques: number;
  orders: number;
  paidOrders: number;
  // 🔴 مبيعات مجمّعة حسب العملة (لا خلط) — [currency, minorSum].
  salesByCurrency: { currency: string; sum: number }[];
  bookings: number;
  confirmedBookings: number;
  series: DayPoint[]; // آخر 14 يوماً عبر المنصّة
  topCreators: {
    id: string;
    displayName: string;
    username: string;
    views: number;
  }[];
  recentCreators: {
    id: string;
    displayName: string;
    username: string;
    isPublished: boolean;
    createdAt: Date;
  }[];
}

// تحليلات المنصّة (admin) — تجميعات مفهرسة.
export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const dates = lastNDates(14);

  const [
    creators,
    published,
    viewAgg,
    orders,
    paidOrders,
    salesGroups,
    bookings,
    confirmedBookings,
    seriesRows,
    topViewRows,
    recentCreators,
  ] = await Promise.all([
    prisma.creatorProfile.count(),
    prisma.creatorProfile.count({ where: { isPublished: true } }),
    prisma.pageViewDaily.aggregate({ _sum: { views: true, uniques: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.groupBy({ by: ["currency"], where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.pageViewDaily.groupBy({
      by: ["date"],
      where: { date: { in: dates } },
      _sum: { views: true, uniques: true },
    }),
    prisma.pageViewDaily.groupBy({
      by: ["creatorProfileId"],
      _sum: { views: true },
      orderBy: { _sum: { views: "desc" } },
      take: 8,
    }),
    prisma.creatorProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        displayName: true,
        username: true,
        isPublished: true,
        createdAt: true,
      },
    }),
  ]);

  const bySeriesDate = new Map(seriesRows.map((r) => [r.date, r._sum]));
  const series: DayPoint[] = dates.map((d) => ({
    date: d,
    views: bySeriesDate.get(d)?.views ?? 0,
    uniques: bySeriesDate.get(d)?.uniques ?? 0,
  }));

  // أسماء أنشط المبدعين.
  const topIds = topViewRows.map((r) => r.creatorProfileId);
  const topProfiles = topIds.length
    ? await prisma.creatorProfile.findMany({
        where: { id: { in: topIds } },
        select: { id: true, displayName: true, username: true },
      })
    : [];
  const pMap = new Map(topProfiles.map((p) => [p.id, p]));
  const topCreators = topViewRows
    .map((r) => {
      const p = pMap.get(r.creatorProfileId);
      if (!p) return null;
      return {
        id: p.id,
        displayName: p.displayName,
        username: p.username,
        views: r._sum.views ?? 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    creators,
    published,
    totalViews: viewAgg._sum.views ?? 0,
    totalUniques: viewAgg._sum.uniques ?? 0,
    orders,
    paidOrders,
    salesByCurrency: salesGroups
      .map((g) => ({ currency: g.currency, sum: g._sum.amount ?? 0 }))
      .sort((a, b) => b.sum - a.sum),
    bookings,
    confirmedBookings,
    series,
    topCreators,
    recentCreators,
  };
}
