"use client";

import { Field, TextInput } from "@/components/dashboard/field";
import { str } from "@/lib/public/block-config";

export function QrEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="العنوان">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder="رمز صفحتي"
        />
      </Field>
      <p className="text-[11px] text-muted-foreground">
        يُولَّد الرمز تلقائياً لرابط صفحتك العامّة — يمكن للزوّار تنزيله (PNG/SVG).
      </p>
    </div>
  );
}
