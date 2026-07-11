import { cn } from "@/lib/utils";

// غلاف بلوك موحّد يستخدم tokens القالب (--pp-*).
export function BlockShell({
  children,
  frosted,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  frosted?: boolean;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "border",
        frosted && "backdrop-blur-md",
        padded && "p-4",
        className,
      )}
      style={{
        background: "var(--pp-surface)",
        borderColor: "var(--pp-surface-border)",
        color: "var(--pp-text)",
        borderRadius: "var(--pp-radius)",
        boxShadow: "var(--pp-shadow)",
      }}
    >
      {children}
    </div>
  );
}

// عنوان «قريباً» موحّد.
export function ComingSoonPill() {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: "color-mix(in oklab, var(--pp-accent) 18%, transparent)",
        color: "var(--pp-text)",
      }}
    >
      قريباً
    </span>
  );
}
