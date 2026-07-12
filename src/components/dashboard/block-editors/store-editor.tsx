"use client";

import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Field, TextInput } from "@/components/dashboard/field";
import {
  ImageUpload,
  deleteManaged,
} from "@/components/dashboard/image-upload";
import { str, num, arr, asRecord } from "@/lib/public/block-config";

export function StoreEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const products = arr(config.products).map((p) => asRecord(p));
  const setProducts = (next: Record<string, unknown>[]) =>
    onChange({ ...config, products: next });
  const patch = (i: number, p: Record<string, unknown>) =>
    setProducts(products.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= products.length) return;
    const next = [...products];
    [next[i], next[j]] = [next[j], next[i]];
    setProducts(next);
  };

  return (
    <div className="space-y-3">
      <Field label="عنوان المتجر (اختياري)">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder="متجري المختار"
        />
      </Field>

      <div className="space-y-3">
        {products.map((p, i) => (
          <div key={i} className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                منتج {i + 1}
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
                    const url = str(p.imageUrl);
                    setProducts(products.filter((_, j) => j !== i));
                    await deleteManaged(url);
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <ImageUpload
                value={str(p.imageUrl)}
                onChange={(v) => patch(i, { imageUrl: v })}
                variant="gallery"
              />
            </div>
            <div className="mt-2 space-y-2">
              <TextInput value={str(p.title)} onChange={(v) => patch(i, { title: v })} placeholder="اسم المنتج" />
              <div className="flex gap-2">
                <TextInput type="number" value={num(p.price) !== null ? String(num(p.price)) : ""} onChange={(v) => patch(i, { price: v === "" ? "" : Number(v) })} placeholder="السعر (اختياري)" />
                <select
                  value={str(p.currency) || "USD"}
                  onChange={(e) => patch(i, { currency: e.target.value })}
                  className="h-9 w-24 shrink-0 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                >
                  <option value="USD">USD</option>
                  <option value="TRY">TRY</option>
                </select>
              </div>
              <TextInput type="url" value={str(p.url)} onChange={(v) => patch(i, { url: v })} placeholder="رابط الشراء (https://)" />
            </div>
          </div>
        ))}

        {products.length < 30 ? (
          <button
            type="button"
            onClick={() => setProducts([...products, { title: "", url: "", imageUrl: "" }])}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="size-4" /> إضافة منتج
          </button>
        ) : null}
      </div>
    </div>
  );
}
