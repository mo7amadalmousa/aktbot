"use client";

import { Plus, Trash2 } from "lucide-react";
import { Field, TextInput } from "@/components/dashboard/field";
import { str, arr, asRecord } from "@/lib/public/block-config";

const FIELD_TYPES = [
  { value: "text", label: "نصّ" },
  { value: "email", label: "بريد" },
  { value: "tel", label: "هاتف" },
  { value: "number", label: "رقم" },
  { value: "textarea", label: "نصّ طويل" },
];

export function FormEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const fields = arr(config.fields).map((f) => asRecord(f));
  const setFields = (next: Record<string, unknown>[]) =>
    onChange({ ...config, fields: next });

  return (
    <div className="space-y-3">
      <Field label="عنوان النموذج">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder="تواصل معي"
        />
      </Field>
      <Field label="نصّ زرّ الإرسال">
        <TextInput
          value={str(config.submitLabel)}
          onChange={(v) => onChange({ ...config, submitLabel: v })}
          placeholder="إرسال"
        />
      </Field>

      <div className="space-y-2">
        <span className="block text-xs font-medium text-foreground">الحقول</span>
        {fields.map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border p-2"
          >
            <TextInput
              value={str(f.label)}
              onChange={(v) => {
                const next = [...fields];
                next[i] = { ...next[i], label: v };
                setFields(next);
              }}
              placeholder="اسم الحقل"
            />
            <select
              value={str(f.type) || "text"}
              onChange={(e) => {
                const next = [...fields];
                next[i] = { ...next[i], type: e.target.value };
                setFields(next);
              }}
              className="h-9 shrink-0 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="حذف الحقل"
              onClick={() => setFields(fields.filter((_, j) => j !== i))}
              className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {fields.length < 12 ? (
          <button
            type="button"
            onClick={() =>
              setFields([...fields, { label: "حقل جديد", type: "text" }])
            }
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="size-4" /> إضافة حقل
          </button>
        ) : null}
      </div>
      <p className="text-[11px] text-muted-foreground">
        استقبال الرسائل الفعليّ يُفعّل لاحقاً — الآن عرض فقط.
      </p>
    </div>
  );
}
