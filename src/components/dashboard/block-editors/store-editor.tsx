"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Package, ExternalLink } from "lucide-react";
import { Field, TextInput } from "@/components/dashboard/field";
import {
  ImageUpload,
  deleteManaged,
} from "@/components/dashboard/image-upload";
import { str, num, arr, asRecord } from "@/lib/public/block-config";
import { formatMoney, currencyList } from "@/lib/payments/money";

interface MyProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  isActive: boolean;
  file: { fileName: string } | null;
}

export function StoreEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  // ── منتجات داخليّة (بالمعرّف) ──────────────────────────────────────
  const productIds = arr(config.productIds)
    .map((v) => str(v))
    .filter(Boolean);
  const [myProducts, setMyProducts] = useState<MyProduct[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/creator/products")
      .then((r) => r.json())
      .then((d) => {
        if (alive && d.ok) setMyProducts(d.products as MyProduct[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const toggleProduct = (id: string) => {
    const next = productIds.includes(id)
      ? productIds.filter((x) => x !== id)
      : [...productIds, id];
    onChange({ ...config, productIds: next });
  };

  // ── منتجات خارجيّة (أفلييت) — الشكل القديم ─────────────────────────
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

  // منتجات رقميّة قابلة للبيع فقط (فعّالة + لها ملف).
  const sellable = (myProducts ?? []).filter((p) => p.isActive && p.file);

  return (
    <div className="space-y-4">
      <Field label="عنوان المتجر (اختياري)">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder="متجري المختار"
        />
      </Field>

      {/* منتجاتي الرقميّة الداخليّة */}
      <div className="rounded-xl border border-border p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Package className="size-4 text-primary" /> منتجاتي الرقميّة
        </div>
        {myProducts === null ? (
          <p className="text-xs text-muted-foreground">جارٍ التحميل…</p>
        ) : sellable.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            لا منتجات رقميّة جاهزة بعد.{" "}
            <a href="/dashboard/products" className="text-primary hover:underline">
              أنشئ منتجاً
            </a>{" "}
            (فعّال وبملف) ثمّ اختره هنا.
          </p>
        ) : (
          <div className="space-y-1.5">
            {sellable.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={productIds.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  className="size-4 accent-[var(--primary,#278A8F)]"
                />
                <span className="flex-1 truncate text-foreground">{p.title}</span>
                <span className="text-xs font-medium text-primary">
                  {formatMoney(p.price, p.currency)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* منتجات خارجيّة (أفلييت) */}
      <div className="rounded-xl border border-border p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ExternalLink className="size-4 text-muted-foreground" /> روابط خارجيّة
          (أفلييت)
        </div>
        <div className="space-y-3">
          {products.map((p, i) => (
            <div key={i} className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  منتج خارجيّ {i + 1}
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
                    {currencyList().map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
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
              <Plus className="size-4" /> إضافة رابط خارجيّ
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
