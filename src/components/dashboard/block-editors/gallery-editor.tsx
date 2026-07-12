"use client";

import { Plus, Trash2 } from "lucide-react";
import { Field, TextInput } from "@/components/dashboard/field";
import { str, arr, asRecord } from "@/lib/public/block-config";

export function GalleryEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const images = arr(config.images).map((it) => asRecord(it));

  const setImages = (next: Record<string, unknown>[]) =>
    onChange({ ...config, images: next });

  return (
    <div className="space-y-3">
      <Field label="عنوان المعرض (اختياري)">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder="مثل: قبل / بعد"
        />
      </Field>

      <div className="space-y-2">
        <span className="block text-xs font-medium text-foreground">
          روابط الصور
        </span>
        <p className="text-[11px] text-muted-foreground">
          الصق رابط صورة (http/https). رفع الصور من الجهاز قريباً.
        </p>
        {images.map((img, i) => (
          <div key={i} className="flex items-center gap-2">
            <TextInput
              value={str(img.url)}
              onChange={(v) => {
                const next = [...images];
                next[i] = { ...next[i], url: v };
                setImages(next);
              }}
              placeholder="https://…/image.jpg"
              type="url"
            />
            <button
              type="button"
              aria-label="حذف الصورة"
              onClick={() => setImages(images.filter((_, j) => j !== i))}
              className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {images.length < 12 ? (
          <button
            type="button"
            onClick={() => setImages([...images, { url: "", alt: "" }])}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="size-4" /> إضافة صورة
          </button>
        ) : null}
      </div>
    </div>
  );
}
