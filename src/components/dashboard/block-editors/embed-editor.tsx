"use client";

import { Field, TextInput } from "@/components/dashboard/field";
import { str } from "@/lib/public/block-config";
import { parseEmbed } from "@/lib/public/safe-url";

export function EmbedEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const url = str(config.url);
  const valid = url ? parseEmbed(url) : null;
  const showWarn = url.length > 0 && !valid;

  return (
    <div className="space-y-3">
      <Field
        label="رابط الفيديو"
        hint="YouTube · Vimeo · TikTok · Instagram Reels"
      >
        <TextInput
          value={url}
          onChange={(v) => onChange({ ...config, url: v })}
          placeholder="https://youtube.com/watch?v=..."
          type="url"
        />
      </Field>
      {showWarn ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          هذا الرابط غير مدعوم للتضمين — سيُرفض عند الحفظ. المنصّات المدعومة:
          YouTube · Vimeo · TikTok · Instagram.
        </p>
      ) : null}
      {valid ? (
        <p className="text-xs text-primary">✓ {valid.provider} — جاهز للعرض.</p>
      ) : null}
      <Field label="عنوان (اختياري)">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder="مثل: روتيني الصباحي"
        />
      </Field>
    </div>
  );
}
