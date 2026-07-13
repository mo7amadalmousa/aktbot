import { prisma } from "@/lib/prisma";
import { lastNDates } from "@/lib/analytics/track";
import type { SaleType, LedgerStatus } from "@/generated/prisma/enums";

export const SALE_TYPE_LABEL: Record<string, string> = {
  CONSULTATION: "استشارة",
  VIDEO: "فيديو خاص",
  STORE_DIGITAL: "منتج رقميّ",
  STORE_COURSE: "كورس",
  STORE_PHYSICAL: "منتج فيزيائيّ",
  BOOKING: "حجز موعد",
  CAMPAIGN: "حملة",
  USAGE_RIGHTS: "حقوق استخدام",
};

export const LEDGER_STATUS_LABEL: Record<string, string> = {
  ACCRUED: "مستحقّة",
  SETTLED: "مُسوّاة",
  REVERSED: "معكوسة",
};

// الحالات التي تُحتسب ضمن الأرباح (المعكوسة تُستبعَد من المجاميع).
const EARNING_STATUSES: LedgerStatus[] = ["ACCRUED", "SETTLED"];

export interface SourceRow {
  saleType: string;
  label: string;
  gross: number;
  commission: number;
  net: number;
  count: number;
}

export interface LedgerRow {
  id: string;
  saleType: string;
  label: string;
  gross: number;
  commission: number;
  net: number;
  status: string;
  statusLabel: string;
  currency: string;
  createdAt: Date;
}

export interface CreatorEarnings {
  totalGross: number;
  totalCommission: number;
  totalNet: number;
  currency: string;
  bySource: SourceRow[];
  ledger: LedgerRow[];
}

// أرباح مبدع — من سجلّ العمولة (مصدر الحقيقة، لا حساب مكرّر).
export async function getCreatorEarnings(
  creatorProfileId: string,
): Promise<CreatorEarnings> {
  const grouped = await prisma.commissionLedger.groupBy({
    by: ["saleType"],
    where: { creatorProfileId, status: { in: EARNING_STATUSES } },
    _sum: { grossAmount: true, commissionAmount: true, netCreatorAmount: true },
    _count: { _all: true },
  });

  const bySource: SourceRow[] = grouped
    .map((g) => ({
      saleType: g.saleType,
      label: SALE_TYPE_LABEL[g.saleType] ?? g.saleType,
      gross: g._sum.grossAmount ?? 0,
      commission: g._sum.commissionAmount ?? 0,
      net: g._sum.netCreatorAmount ?? 0,
      count: g._count._all,
    }))
    .sort((a, b) => b.gross - a.gross);

  const totalGross = bySource.reduce((s, r) => s + r.gross, 0);
  const totalCommission = bySource.reduce((s, r) => s + r.commission, 0);
  const totalNet = bySource.reduce((s, r) => s + r.net, 0);

  const rows = await prisma.commissionLedger.findMany({
    where: { creatorProfileId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const ledger: LedgerRow[] = rows.map((r) => ({
    id: r.id,
    saleType: r.saleType,
    label: SALE_TYPE_LABEL[r.saleType] ?? r.saleType,
    gross: r.grossAmount,
    commission: r.commissionAmount,
    net: r.netCreatorAmount,
    status: r.status,
    statusLabel: LEDGER_STATUS_LABEL[r.status] ?? r.status,
    currency: r.currency,
    createdAt: r.createdAt,
  }));

  const currency = rows[0]?.currency ?? "USD";
  return { totalGross, totalCommission, totalNet, currency, bySource, ledger };
}

export interface PlatformCommission {
  totalCommission: number;
  totalGross: number;
  count: number;
  bySource: SourceRow[];
  series: { date: string; commission: number }[];
}

// سجلّ المنصّة الكلّي (admin).
export async function getPlatformCommission(): Promise<PlatformCommission> {
  const grouped = await prisma.commissionLedger.groupBy({
    by: ["saleType"],
    where: { status: { in: EARNING_STATUSES } },
    _sum: { grossAmount: true, commissionAmount: true, netCreatorAmount: true },
    _count: { _all: true },
  });
  const bySource: SourceRow[] = grouped
    .map((g) => ({
      saleType: g.saleType,
      label: SALE_TYPE_LABEL[g.saleType] ?? g.saleType,
      gross: g._sum.grossAmount ?? 0,
      commission: g._sum.commissionAmount ?? 0,
      net: g._sum.netCreatorAmount ?? 0,
      count: g._count._all,
    }))
    .sort((a, b) => b.commission - a.commission);

  const totalCommission = bySource.reduce((s, r) => s + r.commission, 0);
  const totalGross = bySource.reduce((s, r) => s + r.gross, 0);
  const count = bySource.reduce((s, r) => s + r.count, 0);

  // اتجاه 14 يوماً — bucketing في الذاكرة (حجم منخفض: صفّ لكل طلب).
  const dates = lastNDates(14);
  const since = new Date(`${dates[0]}T00:00:00.000Z`);
  const recent = await prisma.commissionLedger.findMany({
    where: { status: { in: EARNING_STATUSES }, createdAt: { gte: since } },
    select: { commissionAmount: true, createdAt: true },
  });
  const byDay = new Map<string, number>();
  for (const r of recent) {
    const d = r.createdAt.toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + r.commissionAmount);
  }
  const series = dates.map((d) => ({ date: d, commission: byDay.get(d) ?? 0 }));

  return { totalCommission, totalGross, count, bySource, series };
}
