"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2 } from "lucide-react";
import { Field, TextInput, TextArea } from "@/components/dashboard/field";

// تفعيل حساب علامة — يُنشئ BrandProfile ويرقّي الدور ثم ينتقل للوحة العلامة.
export function BrandActivateForm() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!brandName.trim()) return setError("اسم العلامة مطلوب.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/brand/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName, website, contactEmail, description }),
    });
    const d = await res.json().catch(() => ({ ok: false }));
    if (!d.ok) {
      setBusy(false);
      return setError(d.error || "تعذّر التفعيل.");
    }
    // الجلسة أُعيد إصدارها بدور BRAND → انتقل للوحة العلامة.
    window.location.href = "/brand";
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="size-6" />
        </span>
        <h1 className="mt-3 text-xl font-bold text-foreground">تفعيل حساب علامة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أنشئ حملات وأسنِد مبيعاتها لمبدعين عبر روابط/أكواد فريدة.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <Field label="اسم العلامة">
          <TextInput value={brandName} onChange={setBrandName} placeholder="مثال: Glow Cosmetics" />
        </Field>
        <Field label="الموقع (اختياري)">
          <TextInput type="url" value={website} onChange={setWebsite} placeholder="https://…" />
        </Field>
        <Field label="بريد التواصل (اختياري)">
          <TextInput type="email" value={contactEmail} onChange={setContactEmail} placeholder="brand@example.com" />
        </Field>
        <Field label="نبذة (اختياري)">
          <TextArea value={description} onChange={setDescription} placeholder="عن العلامة…" />
        </Field>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          تفعيل والانتقال للوحة العلامة
        </button>
      </div>
    </div>
  );
}
