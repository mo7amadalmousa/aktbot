type Variant = "default" | "success" | "warning" | "danger" | "muted";

const CLS: Record<Variant, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-primary/10 text-primary",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

// شارة حالة موحّدة.
export function StatusBadge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: Variant;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CLS[variant]}`}
    >
      {label}
    </span>
  );
}
