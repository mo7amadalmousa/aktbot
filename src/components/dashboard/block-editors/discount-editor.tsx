"use client";

import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Field, TextInput, Toggle } from "@/components/dashboard/field";
import {
  ImageUpload,
  deleteManaged,
} from "@/components/dashboard/image-upload";
import { str, arr, asRecord } from "@/lib/public/block-config";

export function DiscountEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const coupons = arr(config.coupons).map((cp) => asRecord(cp));
  const setCoupons = (next: Record<string, unknown>[]) =>
    onChange({ ...config, coupons: next });
  const patch = (i: number, p: Record<string, unknown>) =>
    setCoupons(coupons.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= coupons.length) return;
    const next = [...coupons];
    [next[i], next[j]] = [next[j], next[i]];
    setCoupons(next);
  };

  return (
    <div className="space-y-3">
      <Field label="عنوان القسم (اختياري)">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder="خصوماتي"
        />
      </Field>

      <Toggle
        checked={config.showCount !== false}
        onChange={(v) => onChange({ ...config, showCount: v })}
        label="إظهار عدّاد النسخ للزوّار"
      />

      <div className="space-y-3">
        {coupons.map((cp, i) => (
          <div key={i} className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                كوبون {i + 1}
              </span>
              <div className="flex gap-1">
                <button type="button" aria-label="لأعلى" onClick={() => move(i, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" aria-label="لأسفل" onClick={() => move(i, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                  <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="حذف"
                  onClick={async () => {
                    const url = str(cp.logoUrl);
                    setCoupons(coupons.filter((_, j) => j !== i));
                    await deleteManaged(url);
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <div className="mb-2">
              <span className="mb-1 block text-xs font-medium text-foreground">شعار العلامة (اختياري)</span>
              <ImageUpload value={str(cp.logoUrl)} onChange={(v) => patch(i, { logoUrl: v })} variant="gallery" />
            </div>
            <div className="space-y-2">
              <TextInput value={str(cp.brandName)} onChange={(v) => patch(i, { brandName: v })} placeholder="اسم العلامة (مثل Noon)" />
              <TextInput value={str(cp.description)} onChange={(v) => patch(i, { description: v })} placeholder="وصف العرض (خصم 10%…)" />
              <TextInput value={str(cp.code)} onChange={(v) => patch(i, { code: v })} placeholder="كود الخصم" />
              <TextInput type="url" value={str(cp.url)} onChange={(v) => patch(i, { url: v })} placeholder="رابط المتجر (https:// - اختياري)" />
            </div>
          </div>
        ))}

        {coupons.length < 30 ? (
          <button
            type="button"
            onClick={() =>
              setCoupons([
                ...coupons,
                { id: crypto.randomUUID().slice(0, 10), brandName: "", description: "", code: "", url: "", logoUrl: "" },
              ])
            }
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="size-4" /> إضافة كوبون
          </button>
        ) : null}
      </div>
    </div>
  );
}
