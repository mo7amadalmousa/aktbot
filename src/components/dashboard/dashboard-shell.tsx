import Link from "next/link";
import {
  LayoutGrid,
  ShoppingBag,
  Package,
  CalendarClock,
  Mail,
  Tag,
  BarChart3,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// هيكل الداشبورد المشترك (سايدبار + شريط جوّال) — يعاد استخدامه في المحرّر والطلبات.
const NAV_SOON: { label: string; Icon: typeof BarChart3 }[] = [];

type NavKey =
  | "page"
  | "products"
  | "bookings"
  | "orders"
  | "subscribers"
  | "coupons"
  | "analytics"
  | "earnings";

export function DashboardShell({
  active,
  email,
  children,
}: {
  active: NavKey;
  email: string;
  children: React.ReactNode;
}) {
  const navItem = (
    key: NavKey,
    href: string,
    label: string,
    Icon: typeof LayoutGrid,
  ) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active === key
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-4" /> {label}
    </Link>
  );

  return (
    <div className="flex min-h-dvh w-full">
      <aside className="hidden w-56 shrink-0 flex-col border-l border-border bg-card lg:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            A
          </span>
          <span className="font-bold text-foreground">AktBot</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItem("page", "/dashboard", "صفحتي", LayoutGrid)}
          {navItem("products", "/dashboard/products", "المنتجات", Package)}
          {navItem("bookings", "/dashboard/bookings", "المواعيد", CalendarClock)}
          {navItem("orders", "/dashboard/orders", "الطلبات", ShoppingBag)}
          {navItem("earnings", "/dashboard/earnings", "أرباحي", Wallet)}
          {navItem("subscribers", "/dashboard/subscribers", "المشتركون", Mail)}
          {navItem("coupons", "/dashboard/coupons", "الخصومات", Tag)}
          {navItem("analytics", "/dashboard/analytics", "التحليلات", BarChart3)}
          {NAV_SOON.map(({ label, Icon }) => (
            <span
              key={label}
              className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground/60"
            >
              <Icon className="size-4" /> {label}
              <span className="ms-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                قريباً
              </span>
            </span>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <p className="mb-2 truncate px-2 text-xs text-muted-foreground">
            {email}
          </p>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 lg:hidden">
          <span className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              A
            </span>
            <span className="font-bold text-foreground">AktBot</span>
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium",
                active === "page" ? "text-primary" : "text-foreground",
              )}
            >
              صفحتي
            </Link>
            <Link
              href="/dashboard/orders"
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium",
                active === "orders" ? "text-primary" : "text-foreground",
              )}
            >
              الطلبات
            </Link>
            <form method="post" action="/api/auth/logout">
              <button
                type="submit"
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
              >
                خروج
              </button>
            </form>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
