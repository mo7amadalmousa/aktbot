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

// 🔴 مجموعة لكل عملة — لا تُجمع عملات مختلفة (معاملاتها تختلف) في رقم واحد.
export interface CurrencyGroup {
  currency: string;
  gross: number;
  commission: number;
  net: number;
  count: number;
  bySource: SourceRow[];
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
  byCurrency: CurrencyGroup[];
  ledger: LedgerRow[];
}

// يبني مجموعات حسب [العملة] من groupBy([currency, saleType]).
function buildCurrencyGroups(
  rows: {
    currency: string;
    saleType: string;
    _sum: { grossAmount: number | null; commissionAmount: number | null; netCreatorAmount: number | null };
    _count: { _all: number };
  }[],
): CurrencyGroup[] {
  const byCur = new Map<string, CurrencyGroup>();
  for (const r of rows) {
    if (!byCur.has(r.currency)) {
      byCur.set(r.currency, {
        currency: r.currency,
        gross: 0,
        commission: 0,
        net: 0,
        count: 0,
        bySource: [],
      });
    }
    const g = byCur.get(r.currency)!;
    const gross = r._sum.grossAmount ?? 0;
    const commission = r._sum.commissionAmount ?? 0;
    const net = r._sum.netCreatorAmount ?? 0;
    g.gross += gross;
    g.commission += commission;
    g.net += net;
    g.count += r._count._all;
    g.bySource.push({
      saleType: r.saleType,
      label: SALE_TYPE_LABEL[r.saleType] ?? r.saleType,
      gross,
      commission,
      net,
      count: r._count._all,
    });
  }
  for (const g of byCur.values()) g.bySource.sort((a, b) => b.gross - a.gross);
  return [...byCur.values()].sort((a, b) => b.gross - a.gross);
}

// أرباح مبدع — من سجلّ العمولة (مصدر الحقيقة، مجمّعة حسب العملة).
export async function getCreatorEarnings(
  creatorProfileId: string,
): Promise<CreatorEarnings> {
  const grouped = await prisma.commissionLedger.groupBy({
    by: ["currency", "saleType"],
    where: { creatorProfileId, status: { in: EARNING_STATUSES } },
    _sum: { grossAmount: true, commissionAmount: true, netCreatorAmount: true },
    _count: { _all: true },
  });
  const byCurrency = buildCurrencyGroups(grouped);

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

  return { byCurrency, ledger };
}

export interface PlatformCommission {
  byCurrency: CurrencyGroup[];
  txCount: number;
  seriesCount: { date: string; count: number }[]; // عدد المعاملات/يوم (محايد للعملة)
}

// سجلّ المنصّة الكلّي (admin) — مجمّع حسب العملة.
export async function getPlatformCommission(): Promise<PlatformCommission> {
  const grouped = await prisma.commissionLedger.groupBy({
    by: ["currency", "saleType"],
    where: { status: { in: EARNING_STATUSES } },
    _sum: { grossAmount: true, commissionAmount: true, netCreatorAmount: true },
    _count: { _all: true },
  });
  const byCurrency = buildCurrencyGroups(grouped);
  const txCount = byCurrency.reduce((s, g) => s + g.count, 0);

  // الاتجاه: عدد المعاملات/يوم (لا تُجمع مبالغ عملات مختلفة).
  const dates = lastNDates(14);
  const since = new Date(`${dates[0]}T00:00:00.000Z`);
  const recent = await prisma.commissionLedger.findMany({
    where: { status: { in: EARNING_STATUSES }, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const byDay = new Map<string, number>();
  for (const r of recent) {
    const d = r.createdAt.toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const seriesCount = dates.map((d) => ({ date: d, count: byDay.get(d) ?? 0 }));

  return { byCurrency, txCount, seriesCount };
}
