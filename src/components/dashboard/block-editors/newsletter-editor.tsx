"use client";

import { Field, TextInput, TextArea } from "@/components/dashboard/field";
import { str } from "@/lib/public/block-config";

export function NewsletterEditor({
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
          placeholder="اشترك في نشرتي"
        />
      </Field>
      <Field label="الوصف">
        <TextArea
          value={str(config.description)}
          onChange={(v) => onChange({ ...config, description: v })}
          placeholder="ماذا يصل المشترك؟"
        />
      </Field>
      <Field label="نصّ الزرّ">
        <TextInput
          value={str(config.buttonLabel)}
          onChange={(v) => onChange({ ...config, buttonLabel: v })}
          placeholder="اشتراك"
        />
      </Field>
      <p className="text-[11px] text-muted-foreground">
        المشتركون يظهرون في قسم «المشتركون» بلوحة التحكّم. إرسال الحملات لاحقاً.
      </p>
    </div>
  );
}
