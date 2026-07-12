"use client";

import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, TextInput, Toggle } from "@/components/dashboard/field";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { str } from "@/lib/public/block-config";
import { LAYOUTS, type PageTheme } from "@/lib/public/page-theme";
import { LayoutThumbnail } from "@/components/dashboard/layout-thumbnail";
import { FONTS } from "@/lib/public/fonts";
import type { EditorBlock } from "@/lib/creator/editor-types";
import { BLOCK_META } from "@/lib/creator/editor-types";

const GRADIENT_PRESETS = [
  "linear-gradient(160deg,#ff7e5f,#ff5f9e)",
  "linear-gradient(160deg,#a8edea,#34d399)",
  "linear-gradient(160deg,#fbc2eb,#c471f5)",
  "linear-gradient(160deg,#0f2027,#2c5364)",
];

const COLOR_FIELDS: { key: string; label: string; fallback: string }[] = [
  { key: "bg", label: "الخلفية", fallback: "#278a8f" },
  { key: "surface", label: "البطاقات", fallback: "#ffffff" },
  { key: "text", label: "النص", fallback: "#111111" },
  { key: "btn", label: "الأزرار", fallback: "#111111" },
  { key: "btnText", label: "نص الأزرار", fallback: "#ffffff" },
  { key: "accent", label: "التمييز", fallback: "#ec4899" },
];

type Bg = Record<string, unknown>;

export function DesignPanel({
  theme,
  onThemeChange,
  background,
  onBackgroundChange,
  blocks,
}: {
  theme: PageTheme;
  onThemeChange: (patch: Partial<PageTheme>) => void;
  background: Bg;
  onBackgroundChange: (bg: Bg) => void;
  blocks: EditorBlock[];
}) {
  const bgType = str(background.type) || "theme";
  const setColor = (key: string, value: string | null) => {
    const next = { ...theme.colors };
    if (value) next[key] = value;
    else delete next[key];
    onThemeChange({ colors: next });
  };

  const ctaCandidates = blocks.filter((b) => b.id); // بلوكات محفوظة فقط

  return (
    <div className="space-y-6">
      {/* التخطيط */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">التخطيط</p>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onThemeChange({ layout: l.id })}
              className={cn(
                "rounded-xl border p-2 text-start transition-colors",
                theme.layout === l.id
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50",
              )}
            >
              <LayoutThumbnail layout={l.id} />
              <span className="mt-2 block text-sm font-semibold text-foreground">
                {l.label}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {l.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ألوان مخصّصة */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">
          ألوان مخصّصة (اختياريّة)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_FIELDS.map((cf) => (
            <div key={cf.key} className="flex items-center gap-2">
              <input
                type="color"
                value={theme.colors[cf.key] || cf.fallback}
                onChange={(e) => setColor(cf.key, e.target.value)}
                className="h-8 w-10 shrink-0 cursor-pointer rounded border border-input"
              />
              <span className="flex-1 text-xs text-foreground">{cf.label}</span>
              {theme.colors[cf.key] ? (
                <button
                  type="button"
                  aria-label="إلغاء"
                  onClick={() => setColor(cf.key, null)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* الخطّ */}
      <Field label="الخطّ">
        <select
          value={theme.fontFamily}
          onChange={(e) => onThemeChange({ fontFamily: e.target.value })}
          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>

      {/* الخلفية */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">الخلفية</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[
            { key: "theme", label: "افتراضي القالب" },
            { key: "color", label: "لون" },
            { key: "gradient", label: "تدرّج" },
            { key: "image", label: "صورة" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() =>
                onBackgroundChange(opt.key === "theme" ? {} : { type: opt.key })
              }
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                bgType === opt.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {bgType === "color" ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={str(background.color) || "#278a8f"}
              onChange={(e) =>
                onBackgroundChange({ type: "color", color: e.target.value })
              }
              className="h-9 w-12 cursor-pointer rounded-lg border border-input"
            />
            <TextInput
              value={str(background.color)}
              onChange={(v) => onBackgroundChange({ type: "color", color: v })}
              placeholder="#278a8f"
            />
          </div>
        ) : null}
        {bgType === "gradient" ? (
          <div className="grid grid-cols-2 gap-2">
            {GRADIENT_PRESETS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() =>
                  onBackgroundChange({ type: "gradient", gradient: g })
                }
                className={cn(
                  "h-12 rounded-lg border",
                  str(background.gradient) === g
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border",
                )}
                style={{ background: g }}
                aria-label="تدرّج"
              />
            ))}
          </div>
        ) : null}
        {bgType === "image" ? (
          <div>
            <span className="mb-1 block text-xs font-medium text-foreground">
              صورة الخلفية
            </span>
            <ImageUpload
              value={str(background.imageUrl)}
              onChange={(v) => onBackgroundChange({ type: "image", imageUrl: v })}
              variant="background"
            />
          </div>
        ) : null}
      </div>

      {/* التبويبات */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">التبويبات</p>
        <p className="mb-2 text-[11px] text-muted-foreground">
          قسّم صفحتك لتبويبات. تبويب واحد أو صفر = بلا تقسيم.
        </p>
        <div className="space-y-2">
          {theme.tabs.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2">
              <TextInput
                value={t.label}
                onChange={(v) => {
                  const tabs = [...theme.tabs];
                  tabs[i] = { ...tabs[i], label: v };
                  onThemeChange({ tabs });
                }}
                placeholder="اسم التبويب"
              />
              <button
                type="button"
                aria-label="حذف التبويب"
                onClick={() =>
                  onThemeChange({ tabs: theme.tabs.filter((_, j) => j !== i) })
                }
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {theme.tabs.length < 8 ? (
            <button
              type="button"
              onClick={() =>
                onThemeChange({
                  tabs: [
                    ...theme.tabs,
                    { id: crypto.randomUUID().slice(0, 8), label: "تبويب" },
                  ],
                })
              }
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="size-4" /> إضافة تبويب
            </button>
          ) : null}
        </div>
      </div>

      {/* زر ثابت */}
      <div className="rounded-xl border border-border p-3">
        <Toggle
          checked={theme.stickyCta.enabled}
          onChange={(v) =>
            onThemeChange({ stickyCta: { ...theme.stickyCta, enabled: v } })
          }
          label="زر ثابت أسفل الشاشة"
        />
        {theme.stickyCta.enabled ? (
          <div className="mt-3 space-y-2">
            <Field label="البلوك المستهدف">
              <select
                value={theme.stickyCta.blockId ?? ""}
                onChange={(e) =>
                  onThemeChange({
                    stickyCta: { ...theme.stickyCta, blockId: e.target.value || undefined },
                  })
                }
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              >
                <option value="">— اختر —</option>
                {ctaCandidates.map((b) => (
                  <option key={b.id} value={b.id}>
                    {BLOCK_META[b.type]?.label ?? b.type} · {str(b.config.title) || str(b.config.label) || ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="نصّ الزرّ (اختياريّ)">
              <TextInput
                value={theme.stickyCta.label ?? ""}
                onChange={(v) =>
                  onThemeChange({ stickyCta: { ...theme.stickyCta, label: v || undefined } })
                }
                placeholder="احجز الآن"
              />
            </Field>
            {ctaCandidates.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                احفظ البلوكات أولاً لتظهر هنا.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
