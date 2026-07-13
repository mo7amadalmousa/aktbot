"use client";

import { useState, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  FileText,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Field, TextInput } from "@/components/dashboard/field";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { formatMoney } from "@/lib/payments/money";

export interface DashProduct {
  id: string;
  title: string;
  description: string | null;
  price: number; // minor units
  currency: string;
  images: unknown;
  isActive: boolean;
  file: { fileName: string; size: number } | null;
  orderCount: number;
}

interface FormState {
  id: string | null;
  title: string;
  description: string;
  priceMajor: string;
  currency: string;
  image: string;
  isActive: boolean;
  // ملف جديد مرفوع لهذه الجلسة (اختياريّ عند التعديل)
  file: { fileKey: string; fileName: string; size: number } | null;
  // اسم ملف قائم (عند التعديل) للعرض فقط
  existingFileName: string | null;
}

const empty: FormState = {
  id: null,
  title: "",
  description: "",
  priceMajor: "",
  currency: "USD",
  image: "",
  isActive: true,
  file: null,
  existingFileName: null,
};

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

function firstImage(images: unknown): string {
  return Array.isArray(images) && typeof images[0] === "string" ? images[0] : "";
}

export function ProductManager({ initial }: { initial: DashProduct[] }) {
  const [products, setProducts] = useState<DashProduct[]>(initial);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setError(null);
    setForm({ ...empty });
  };
  const openEdit = (p: DashProduct) => {
    setError(null);
    setForm({
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      priceMajor: String(p.price / 100), // minor→major (USD/TRY factor=100)
      currency: p.currency,
      image: firstImage(p.images),
      isActive: p.isActive,
      file: null,
      existingFileName: p.file?.fileName ?? null,
    });
  };

  const refresh = async () => {
    const d = await fetch("/api/creator/products").then((r) => r.json());
    if (d.ok) setProducts(d.products as DashProduct[]);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !form) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/creator/product-file", {
        method: "POST",
        body: fd,
      });
      const d = await res.json();
      if (!d.ok) {
        setError(d.error || "تعذّر رفع الملف.");
      } else {
        setForm({
          ...form,
          file: { fileKey: d.fileKey, fileName: d.fileName, size: d.size },
        });
      }
    } catch {
      setError("تعذّر رفع الملف.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) return setError("عنوان المنتج مطلوب.");
    if (!form.priceMajor || Number(form.priceMajor) <= 0)
      return setError("السعر يجب أن يكون أكبر من صفر.");
    if (!form.id && !form.file)
      return setError("ارفع ملف المنتج الرقميّ.");

    setBusy(true);
    setError(null);
    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.priceMajor),
      currency: form.currency,
      images: form.image ? [form.image] : [],
      isActive: form.isActive,
      ...(form.file ? { file: form.file } : {}),
    };
    const res = await fetch(
      form.id ? `/api/creator/products/${form.id}` : "/api/creator/products",
      {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!d.ok) return setError(d.error || "تعذّر الحفظ.");
    setForm(null);
    await refresh();
  };

  const remove = async (p: DashProduct) => {
    if (!confirm(`حذف «${p.title}»؟ لا يمكن التراجع.`)) return;
    setBusy(true);
    const res = await fetch(`/api/creator/products/${p.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (d.ok) setProducts((xs) => xs.filter((x) => x.id !== p.id));
  };

  // ── نموذج الإنشاء/التعديل ──────────────────────────────────────────
  if (form) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={() => setForm(null)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4" /> رجوع
        </button>
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {form.id ? "تعديل منتج" : "منتج رقميّ جديد"}
        </h2>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <Field label="عنوان المنتج">
            <TextInput
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
              placeholder="مثال: كتيّب العناية بالبشرة (PDF)"
            />
          </Field>

          <Field label="الوصف (اختياري)">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="ماذا سيحصل عليه المشتري؟"
            />
          </Field>

          <div className="flex gap-2">
            <Field label="السعر">
              <TextInput
                type="number"
                value={form.priceMajor}
                onChange={(v) => setForm({ ...form, priceMajor: v })}
                placeholder="9.99"
              />
            </Field>
            <div className="w-28 shrink-0">
              <Field label="العملة">
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                >
                  <option value="USD">USD</option>
                  <option value="TRY">TRY</option>
                </select>
              </Field>
            </div>
          </div>

          <Field label="صورة الغلاف (اختياري)">
            <ImageUpload
              value={form.image}
              onChange={(v) => setForm({ ...form, image: v })}
              variant="gallery"
            />
          </Field>

          <div>
            <span className="mb-1 block text-sm font-medium text-foreground">
              ملف المنتج الرقميّ {form.id ? "(اترك فارغاً للإبقاء على الحاليّ)" : ""}
            </span>
            <input
              ref={fileRef}
              type="file"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {uploading ? "جارٍ الرفع…" : "رفع ملف"}
            </button>
            {form.file ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-primary">
                <FileText className="size-3.5" /> {form.file.fileName} ·{" "}
                {fmtSize(form.file.size)} (جديد)
              </p>
            ) : form.existingFileName ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="size-3.5" /> {form.existingFileName} (الحاليّ)
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                لا يُخدَم الملف علناً — يُسلَّم فقط برابط آمن بعد الدفع.
              </p>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="size-4 accent-[var(--primary,#278A8F)]"
            />
            نشط (متاح للبيع)
          </label>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy || uploading}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── قائمة المنتجات ─────────────────────────────────────────────────
  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-foreground">المنتجات الرقميّة</h1>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> منتج جديد
        </button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          لا منتجات بعد. أنشئ أوّل منتج رقميّ للبيع في متجرك.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const img = firstImage(p.images);
            return (
              <div
                key={p.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.title} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <FileText className="size-8" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                      {p.title}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        p.isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.isActive ? "نشط" : "مخفيّ"}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-primary">
                    {formatMoney(p.price, p.currency)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.file ? (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-3" /> {p.file.fileName}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        بلا ملف — لن يُباع
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    مبيعات: {p.orderCount}
                  </p>
                  <div className="mt-3 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <Pencil className="size-3.5" /> تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      disabled={busy}
                      className="inline-flex items-center justify-center rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
