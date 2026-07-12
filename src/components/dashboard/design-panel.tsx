"use client";

import { cn } from "@/lib/utils";
import { Field, TextInput } from "@/components/dashboard/field";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { str } from "@/lib/public/block-config";
import {
  THEME_IDS,
  THEME_META,
  themePageBackground,
} from "@/lib/public/themes";

const GRADIENT_PRESETS = [
  "linear-gradient(160deg,#ff7e5f,#ff5f9e)",
  "linear-gradient(160deg,#a8edea,#34d399)",
  "linear-gradient(160deg,#fbc2eb,#c471f5)",
  "linear-gradient(160deg,#0f2027,#2c5364)",
];

type Bg = Record<string, unknown>;

export function DesignPanel({
  themeId,
  onThemeChange,
  background,
  onBackgroundChange,
}: {
  themeId: string;
  onThemeChange: (id: string) => void;
  background: Bg;
  onBackgroundChange: (bg: Bg) => void;
}) {
  const bgType = str(background.type) || "theme";

  return (
    <div className="space-y-6">
      {/* القوالب */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">القالب</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onThemeChange(id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors",
                themeId === id
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50",
              )}
            >
              <span
                className="h-12 w-full rounded-lg border border-border"
                style={{ background: themePageBackground(id) }}
              />
              <span className="text-xs font-medium text-foreground">
                {THEME_META[id].label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* الخلفية */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">الخلفية</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[
            { key: "theme", label: "افتراضي القالب" },
            { key: "color", label: "لون" },
            { key: "gradient", label: "تدرّج" },
            { key: "image", label: "صورة" },
            { key: "video", label: "فيديو", disabled: true },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              disabled={opt.disabled}
              onClick={() =>
                onBackgroundChange(
                  opt.key === "theme" ? {} : { type: opt.key },
                )
              }
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                bgType === opt.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground hover:bg-muted",
                opt.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {opt.label}
              {opt.disabled ? " (قريباً)" : ""}
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
              onChange={(v) =>
                onBackgroundChange({ type: "color", color: v })
              }
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
              onChange={(v) =>
                onBackgroundChange({ type: "image", imageUrl: v })
              }
              variant="background"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
