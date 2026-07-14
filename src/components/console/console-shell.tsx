"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/components/i18n/i18n-provider";
import { CONSOLE_NAV, activeHref } from "@/lib/console/nav";
import { ThemeSwitch } from "./theme-switch";
import { LanguageSwitch } from "./language-switch";

// تخطيط الكونسول الموحّد — شريط جانبيّ (مجموعات) + رأس (بحث/لغة/وضع/حساب).
// كل صفحات /admin/* تُبنى داخله. RTL/LTR + الوضعان.
export function ConsoleShell({
  email,
  dir,
  children,
}: {
  email: string;
  dir: "rtl" | "ltr";
  children: React.ReactNode;
}) {
  const t = useMessages().admin;
  const pathname = usePathname();
  const active = activeHref(pathname);
  const [open, setOpen] = useState(false);

  const Sidebar = (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      <div className="flex items-center gap-2 px-2 py-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          A
        </span>
        <span className="font-bold text-foreground">{t.brand}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          <ShieldCheck className="size-3" /> ADMIN
        </span>
      </div>

      {CONSOLE_NAV.map((group) => (
        <div key={group.key}>
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {t.nav[group.key]}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((it) => {
              const Icon = it.icon;
              const isActive = it.enabled && active === it.href;
              if (!it.enabled) {
                return (
                  <li key={it.key}>
                    <span className="flex cursor-not-allowed items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground/50">
                      <Icon className="size-4" />
                      {t.nav[it.key]}
                      <span className="ms-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px]">
                        {t.nav.soon}
                      </span>
                    </span>
                  </li>
                );
              }
              return (
                <li key={it.key}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                    {t.nav[it.key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div dir={dir} className="flex min-h-dvh w-full bg-muted/20">
      {/* شريط جانبيّ ثابت (سطح المكتب) */}
      <aside className="hidden w-60 shrink-0 border-e border-border bg-card lg:block">
        {Sidebar}
      </aside>

      {/* شريط جانبيّ منزلق (جوّال) */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 start-0 w-64 border-e border-border bg-card">
            {Sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* الرأس */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="menu"
            className="rounded-lg border border-border p-1.5 text-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="size-4" />
          </button>

          <div className="relative hidden max-w-xs flex-1 sm:block">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder={t.searchPlaceholder}
              className="h-9 w-full rounded-lg border border-input bg-background ps-9 pe-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitch />
            <ThemeSwitch />
            <span className="hidden truncate text-xs text-muted-foreground md:inline">
              {email}
            </span>
            <form method="post" action="/api/auth/logout">
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t.logout}
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-5">{children}</main>
      </div>

      {/* زرّ إغلاق للجوّال حين مفتوح */}
      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed end-4 top-3 z-50 rounded-lg bg-card p-1.5 text-foreground shadow lg:hidden"
          aria-label="close"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
