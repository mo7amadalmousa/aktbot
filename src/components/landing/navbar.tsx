"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useMessages } from "@/components/i18n/i18n-provider";
import { SIGNUP_URL, LOGIN_URL } from "@/lib/site";
import { BrandLogo } from "./landing-ui";
import { ThemeToggle } from "./theme-toggle";
import { LangSwitcher } from "./lang-switcher";

export function Navbar() {
  const nav = useMessages().landing.nav;
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#creators", label: nav.forCreators },
    { href: "#brands", label: nav.forBrands },
    { href: "#features", label: nav.features },
    { href: "#how", label: nav.how },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandLogo />

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LangSwitcher />
          <ThemeToggle />
          <a
            href={LOGIN_URL}
            className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            {nav.login}
          </a>
          <a
            href={SIGNUP_URL}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {nav.cta}
          </a>
        </div>

        {/* جوّال */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label="القائمة"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-foreground"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-2">
            <LangSwitcher />
            <div className="flex flex-1 items-center justify-end gap-2">
              <a
                href={LOGIN_URL}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {nav.login}
              </a>
              <a
                href={SIGNUP_URL}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                {nav.cta}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
