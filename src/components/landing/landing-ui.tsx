import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        A
      </span>
      <span className="text-lg font-bold text-foreground">AktBot</span>
    </Link>
  );
}

export function PrimaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-primary/90",
        className,
      )}
    >
      {children}
      <ArrowLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
    </a>
  );
}

export function SecondaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      {children}
    </a>
  );
}

export function SectionHeading({
  badge,
  title,
  subtitle,
  center = true,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {badge ? (
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {badge}
        </span>
      ) : null}
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
