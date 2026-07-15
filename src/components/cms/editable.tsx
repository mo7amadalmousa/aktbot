"use client";

import { Pencil, ImagePlus, Link2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldText, fieldUrl, sectionVisible, fieldList, type ListItem } from "@/lib/cms/fields";
import { useCms, type ListFieldDef } from "./cms-context";

// شارة تحرير صغيرة (لا تظهر للزائر إطلاقاً — محكومة بـeditMode).
function EditBadge({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute -top-2 -end-2 z-20 inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background">
      {icon}
    </span>
  );
}

const editableCls =
  "relative cursor-pointer rounded outline-2 outline-dashed outline-primary/50 outline-offset-2 transition hover:outline-primary";

// ── نصّ قابل للتحرير (سطر/فقرة) ────────────────────────────────────────
export function EditableText({
  field,
  def,
  as = "span",
  className,
  multiline,
}: {
  field: string;
  def: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  multiline?: boolean;
}) {
  const { values, admin } = useCms();
  const value = fieldText(values, field, def);
  const El = as as React.ElementType;

  if (!admin?.editMode) return <El className={className}>{value}</El>;
  return (
    <El
      className={cn(className, editableCls)}
      role="button"
      tabIndex={0}
      onClick={() => admin.openEditor(field, multiline ? "richtext" : "text", value)}
    >
      {value}
      <EditBadge icon={<Pencil className="size-3" />} />
    </El>
  );
}

// ── صورة قابلة للتحرير (رفع عبر الطبقة القائمة) ────────────────────────
export function EditableImage({
  field,
  def,
  alt,
  className,
}: {
  field: string;
  def: string;
  alt: string;
  className?: string;
}) {
  const { values, admin } = useCms();
  const src = fieldUrl(values, field, def);
  return (
    <span className={cn("relative inline-block", admin?.editMode && editableCls)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={className} />
      {admin?.editMode ? (
        <button
          type="button"
          onClick={() => admin.openEditor(field, "image", src)}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-white opacity-0 transition hover:opacity-100"
          aria-label="تغيير الصورة"
        >
          <ImagePlus className="size-6" />
        </button>
      ) : null}
    </span>
  );
}

// ── زرّ/رابط قابل للتحرير (نصّ + رابط) ─────────────────────────────────
export function EditableLink({
  field,
  defText,
  defHref,
  className,
}: {
  field: string;
  defText: string;
  defHref: string;
  className?: string;
}) {
  const { values, admin } = useCms();
  const text = fieldText(values, `${field}.text`, defText);
  const href = fieldUrl(values, `${field}.href`, defHref);

  if (!admin?.editMode) {
    return (
      <a href={href} className={className}>
        {text}
      </a>
    );
  }
  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(className, editableCls, "relative")}
      onClick={() => admin.openEditor(field, "link", { text, href }, { defText, defHref })}
    >
      {text}
      <EditBadge icon={<Link2 className="size-3" />} />
    </span>
  );
}

// ── سكشن قابل للإظهار/الإخفاء ──────────────────────────────────────────
export function EditableSection({
  id,
  children,
  className,
  as = "section",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const { values, admin } = useCms();
  const visible = sectionVisible(values, id);
  const El = as as React.ElementType;

  // الزائر: السكشن المخفيّ لا يُرسَم إطلاقاً.
  if (!admin?.editMode && !visible) return null;

  return (
    <El className={cn(className, "relative", admin?.editMode && !visible && "opacity-40")}>
      {admin?.editMode ? (
        <button
          type="button"
          onClick={() => admin.toggleSection(id)}
          className="absolute end-3 top-3 z-30 inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow ring-1 ring-border"
          aria-label={visible ? "إخفاء السكشن" : "إظهار السكشن"}
        >
          {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {visible ? "ظاهر" : "مخفيّ"}
        </button>
      ) : null}
      {children}
    </El>
  );
}

// ── قائمة قابلة للتحرير (سلايدر/عناصر) — عرض + محرّر ────────────────────
export function EditableList({
  field,
  def,
  listFields,
  render,
  className,
}: {
  field: string;
  def: ListItem[];
  listFields: ListFieldDef[];
  render: (items: ListItem[]) => React.ReactNode;
  className?: string;
}) {
  const { values, admin } = useCms();
  const items = fieldList(values, field, def);

  return (
    <div className={cn("relative", className)}>
      {admin?.editMode ? (
        <button
          type="button"
          onClick={() => admin.openEditor(field, "list", items, { listFields })}
          className="absolute -top-3 end-0 z-30 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground shadow"
        >
          <Pencil className="size-3" /> تحرير القائمة
        </button>
      ) : null}
      {render(items)}
    </div>
  );
}
