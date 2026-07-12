"use client";

import { Field, TextInput } from "@/components/dashboard/field";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { str } from "@/lib/public/block-config";

export function BeforeAfterEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-foreground">
            صورة «قبل»
          </span>
          <ImageUpload
            value={str(config.beforeUrl)}
            onChange={(v) => onChange({ ...config, beforeUrl: v })}
            variant="gallery"
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-foreground">
            صورة «بعد»
          </span>
          <ImageUpload
            value={str(config.afterUrl)}
            onChange={(v) => onChange({ ...config, afterUrl: v })}
            variant="gallery"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="تسمية «قبل»">
          <TextInput
            value={str(config.beforeLabel)}
            onChange={(v) => onChange({ ...config, beforeLabel: v })}
            placeholder="قبل"
          />
        </Field>
        <Field label="تسمية «بعد»">
          <TextInput
            value={str(config.afterLabel)}
            onChange={(v) => onChange({ ...config, afterLabel: v })}
            placeholder="بعد"
          />
        </Field>
      </div>

      <Field label="اتجاه السلايدر">
        <select
          value={str(config.orientation) || "horizontal"}
          onChange={(e) => onChange({ ...config, orientation: e.target.value })}
          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
        >
          <option value="horizontal">أفقيّ</option>
          <option value="vertical">عموديّ</option>
        </select>
      </Field>
    </div>
  );
}
