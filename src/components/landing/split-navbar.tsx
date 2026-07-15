"use client";

import { useMessages } from "@/components/i18n/i18n-provider";
import { SIGNUP_URL, LOGIN_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./landing-ui";
import { ThemeToggle } from "./theme-toggle";
import { LangSwitcher } from "./lang-switcher";
import { useAudience, type Audience } from "./audience-context";

// مبدّل الجمهور البارز — علامات | مبدعون (segmented control).
export function AudienceToggle({ size = "md" }: { size?: "md" | "sm" }) {
  const t = useMessages().landing.split;
  const { audience, setAudience } = useAudience();
  const opt = (a: Audience, label: string) => (
    <button
      type="button"
      onClick={() => setAudience(a)}
      aria-pressed={audience === a}
      className={cn(
        "rounded-full font-semibold transition",
        size === "md" ? "px-5 py-2 text-sm" : "px-3.5 py-1.5 text-xs",
        audience === a ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className={cn("inline-flex items-center rounded-full border border-border bg-muted/40 p-1", size === "md" && "gap-1")}>
      {opt("brands", t.brandsTab)}
      {opt("creators", t.creatorsTab)}
    </div>
  );
}

export function SplitNavbar() {
  const nav = useMessages().landing.nav;
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <BrandLogo />

        {/* المبدّل البارز — مركز الشريط */}
        <div className="hidden md:block">
          <AudienceToggle />
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LangSwitcher />
          <ThemeToggle />
          <a href={LOGIN_URL} className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            {nav.login}
          </a>
          <a href={SIGNUP_URL} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {nav.cta}
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LangSwitcher />
          <ThemeToggle />
        </div>
      </div>

      {/* شريط المبدّل للجوّال (بارز) */}
      <div className="flex items-center justify-center gap-3 border-t border-border/60 py-2 md:hidden">
        <AudienceToggle size="sm" />
        <a href={SIGNUP_URL} className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
          {nav.cta}
        </a>
      </div>
    </header>
  );
}
