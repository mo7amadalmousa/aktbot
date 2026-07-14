import Link from "next/link";
import { getPlatformAnalytics } from "@/lib/analytics/query";
import { getMessages } from "@/lib/i18n";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { PageHeader } from "@/components/console/page-header";
import { StatCard, fmtNum } from "@/components/console/stat-card";
import { MiniBars } from "@/components/dashboard/analytics-bits";
import { RecentCreatorsTable } from "@/components/console/tables/recent-creators-table";
import { formatMoney } from "@/lib/payments/money";
import { Users, Globe, Eye, ShoppingBag, CalendarClock, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

// نظرة عامّة على المنصّة — على أساس الكونسول الموحّد (الحماية عبر layout).
export default async function AdminPage() {
  const [a, m] = await Promise.all([getPlatformAnalytics(), getAppLocale().then(getMessages)]);
  const t = m.admin.overview;

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.desc}
        actions={
          <Link
            href="/admin/commission"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {m.admin.commission.title} ←
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.creators} value={fmtNum(a.creators)} sub={`${fmtNum(a.published)} ${t.published}`} icon={<Users className="size-4" />} accent />
        <StatCard label={t.visitors} value={fmtNum(a.totalViews)} sub={`${fmtNum(a.totalUniques)} ${t.unique}`} icon={<Eye className="size-4" />} />
        <StatCard label={t.orders} value={fmtNum(a.orders)} sub={`${fmtNum(a.paidOrders)} ${t.paid}`} icon={<ShoppingBag className="size-4" />} />
        <StatCard
          label={t.sales}
          value={a.salesByCurrency.length === 0 ? "—" : a.salesByCurrency.map((s) => formatMoney(s.sum, s.currency)).join(" · ")}
          sub={t.salesSub}
          icon={<DollarSign className="size-4" />}
        />
        <StatCard label={t.published} value={fmtNum(a.published)} icon={<Globe className="size-4" />} />
        <StatCard label={t.bookings} value={fmtNum(a.bookings)} sub={`${fmtNum(a.confirmedBookings)} ${t.confirmed}`} icon={<CalendarClock className="size-4" />} />
      </div>

      <div className="mb-5">
        <MiniBars series={a.series} label={t.trend} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* أنشط المبدعين — قائمة مرتّبة */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">{t.topCreators}</p>
          {a.topCreators.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t.noData}</p>
          ) : (
            <div className="space-y-2">
              {a.topCreators.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-muted-foreground">{i + 1}.</span>
                  <Link href={`/u/${c.username}`} className="flex-1 truncate text-foreground hover:text-primary">
                    {c.displayName}
                    <span className="ms-1 text-xs text-muted-foreground">/{c.username}</span>
                  </Link>
                  <span className="font-medium text-foreground">{fmtNum(c.views)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* أحدث المبدعين — DataTable الموحّد */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">{t.recentCreators}</p>
          <RecentCreatorsTable
            rows={a.recentCreators.map((c) => ({
              id: c.id,
              displayName: c.displayName,
              username: c.username,
              isPublished: c.isPublished,
              createdAt: c.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </>
  );
}
