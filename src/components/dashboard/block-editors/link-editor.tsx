"use client";

import { Field, TextInput } from "@/components/dashboard/field";
import { str } from "@/lib/public/block-config";

export function LinkEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="عنوان الزر">
        <TextInput
          value={str(config.label)}
          onChange={(v) => onChange({ ...config, label: v })}
          placeholder="مثل: احجزي استشارتك"
        />
      </Field>
      <Field label="الرابط" hint="http:// أو https:// فقط">
        <TextInput
          value={str(config.url)}
          onChange={(v) => onChange({ ...config, url: v })}
          placeholder="https://example.com"
          type="url"
        />
      </Field>
      <Field label="وصف مختصر (اختياري)">
        <TextInput
          value={str(config.subtitle)}
          onChange={(v) => onChange({ ...config, subtitle: v })}
          placeholder="مثل: ردّ خلال ٢٤ ساعة"
        />
      </Field>
    </div>
  );
}
