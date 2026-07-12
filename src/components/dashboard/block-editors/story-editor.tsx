"use client";

import { Trash2 } from "lucide-react";
import { Field, TextInput } from "@/components/dashboard/field";
import {
  ImageUpload,
  deleteManaged,
} from "@/components/dashboard/image-upload";
import { str, arr, asRecord } from "@/lib/public/block-config";

export function StoryEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const media = arr(config.media).map((m) => asRecord(m));
  const mode = str(config.mode) === "VIEW_ONCE" ? "VIEW_ONCE" : "TIME_24H";

  // إضافة/حذف وسائط يُعيد ضبط وقت النشر (يبدأ عدّ الـ24 ساعة الآن).
  const setMedia = (next: Record<string, unknown>[]) =>
    onChange({ ...config, media: next, publishedAt: Date.now() });

  return (
    <div className="space-y-3">
      <Field label="عنوان الستوري">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder="ستوري"
        />
      </Field>

      <Field label="مدّة الظهور">
        <select
          value={mode}
          onChange={(e) =>
            onChange({ ...config, mode: e.target.value, publishedAt: Date.now() })
          }
          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
        >
          <option value="TIME_24H">٢٤ ساعة ثم تختفي</option>
          <option value="VIEW_ONCE">مشاهدة واحدة لكل زائر</option>
        </select>
      </Field>

      <div className="space-y-2">
        <span className="block text-xs font-medium text-foreground">
          اللقطات
        </span>
        {media.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {media.map((m, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-lg border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={str(m.url)}
                  alt=""
                  className="aspect-[9/16] w-full object-cover"
                />
                <button
                  type="button"
                  aria-label="حذف"
                  onClick={async () => {
                    const url = str(m.url);
                    setMedia(media.filter((_, j) => j !== i));
                    await deleteManaged(url);
                  }}
                  className="absolute bottom-1 end-1 rounded bg-black/50 p-0.5 text-white/90"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {media.length < 10 ? (
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="mb-2 text-xs text-muted-foreground">إضافة لقطة</p>
            <ImageUpload
              value=""
              variant="gallery"
              onChange={(url) => {
                if (url) setMedia([...media, { url }]);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
