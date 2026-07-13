import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPlatformAnalytics } from "@/lib/analytics/query";
import { StatCard, MiniBars, fmtNum } from "@/components/dashboard/analytics-bits";
import { formatMoney } from "@/lib/payments/money";
import {
  Users,
  Globe,
  Eye,
  ShoppingBag,
  CalendarClock,
  DollarSign,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

// لوحة إشراف المنصّة — دور ADMIN حصراً (proxy يحرس + تحقّق مزدوج هنا). للقراءة فقط.
export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const a = await getPlatformAnalytics();

  return (
    <main className="min-h-dvh w-full bg-muted/20">
      <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            A
          </span>
          <span className="font-bold text-foreground">لوحة الإشراف</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <ShieldCheck className="size-3" /> ADMIN
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {session.email}
          </span>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              خروج
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-foreground">نظرة عامّة على المنصّة</h1>
          <Link
            href="/admin/commission"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            طبقة العمولة ←
          </Link>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="المبدعون" value={fmtNum(a.creators)} sub={`${fmtNum(a.published)} صفحة منشورة`} icon={<Users className="size-4" />} accent />
          <StatCard label="إجمالي الزوّار" value={fmtNum(a.totalViews)} sub={`${fmtNum(a.totalUniques)} فريد`} icon={<Eye className="size-4" />} />
          <StatCard label="الطلبات" value={fmtNum(a.orders)} sub={`${fmtNum(a.paidOrders)} مدفوعة`} icon={<ShoppingBag className="size-4" />} />
          <StatCard
            label="المبيعات (mock)"
            value={
              a.salesByCurrency.length === 0
                ? "—"
                : a.salesByCurrency.map((s) => formatMoney(s.sum, s.currency)).join(" · ")
            }
            sub="مجمّعة حسب العملة"
            icon={<DollarSign className="size-4" />}
          />
          <StatCard label="الصفحات المنشورة" value={fmtNum(a.published)} icon={<Globe className="size-4" />} />
          <StatCard label="الحجوزات" value={fmtNum(a.bookings)} sub={`${fmtNum(a.confirmedBookings)} مؤكّدة`} icon={<CalendarClock className="size-4" />} />
        </div>

        <div className="mb-5">
          <MiniBars series={a.series} label="زيارات المنصّة" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* أنشط المبدعين */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">أنشط المبدعين (بالزيارات)</p>
            {a.topCreators.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا بيانات بعد.</p>
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

          {/* أحدث المبدعين */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">أحدث المبدعين</p>
            {a.recentCreators.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا مبدعين بعد.</p>
            ) : (
              <div className="space-y-2">
                {a.recentCreators.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 truncate text-foreground">
                      {c.displayName}
                      <span className="ms-1 text-xs text-muted-foreground">/{c.username}</span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        c.isPublished ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.isPublished ? "منشور" : "مسودّة"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          للقراءة والإشراف فقط · الإيراد عبر طبقة دفع تجريبيّة (mock) — البنية جاهزة للحقيقيّ.
        </p>
      </div>
    </main>
  );
}
