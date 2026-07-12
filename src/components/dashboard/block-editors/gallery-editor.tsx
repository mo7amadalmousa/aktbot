"use client";

import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Field, TextInput } from "@/components/dashboard/field";
import {
  ImageUpload,
  deleteManaged,
} from "@/components/dashboard/image-upload";
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

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    setImages(next);
  };

  const removeAt = async (i: number) => {
    const url = str(images[i]?.url);
    setImages(images.filter((_, j) => j !== i));
    await deleteManaged(url);
  };

  return (
    <div className="space-y-3">
      <Field label="عنوان المعرض (اختياري)">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder="مثل: أعمالي"
        />
      </Field>

      <div className="space-y-2">
        <span className="block text-xs font-medium text-foreground">الصور</span>
        {images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-lg border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={str(img.url)}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1 py-0.5">
                  <button
                    type="button"
                    aria-label="لأعلى"
                    onClick={() => move(i, -1)}
                    className="rounded p-0.5 text-white/90 hover:bg-white/20"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="لأسفل"
                    onClick={() => move(i, 1)}
                    className="rounded p-0.5 text-white/90 hover:bg-white/20"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="حذف"
                    onClick={() => removeAt(i)}
                    className="rounded p-0.5 text-white/90 hover:bg-white/20"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {images.length < 12 ? (
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="mb-2 text-xs text-muted-foreground">إضافة صورة</p>
            <ImageUpload
              value=""
              variant="gallery"
              onChange={(url) => {
                if (url) setImages([...images, { url, alt: "" }]);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
