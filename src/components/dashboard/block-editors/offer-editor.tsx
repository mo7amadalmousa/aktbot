"use client";

import { Field, TextInput, TextArea } from "@/components/dashboard/field";
import { str, num } from "@/lib/public/block-config";
import { SUPPORTED_CURRENCIES } from "@/lib/payments/money";

// محرّر بلوكَي الدفع (CONSULTATION / PAID_VIDEO).
export function OfferEditor({
  config,
  onChange,
  kind,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  kind: "consultation" | "paid_video";
}) {
  const price = num(config.price);

  return (
    <div className="space-y-3">
      <Field label="العنوان">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder={kind === "consultation" ? "استشارة خاصّة" : "فيديو خاص"}
        />
      </Field>
      <Field label="الوصف">
        <TextArea
          value={str(config.description)}
          onChange={(v) => onChange({ ...config, description: v })}
          placeholder="ماذا يحصل عليه المشتري؟"
        />
      </Field>
      {kind === "consultation" ? (
        <Field label="المدّة">
          <TextInput
            value={str(config.duration)}
            onChange={(v) => onChange({ ...config, duration: v })}
            placeholder="٣٠ دقيقة"
          />
        </Field>
      ) : null}
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="السعر" hint="أكبر من صفر">
            <TextInput
              type="number"
              value={price !== null ? String(price) : ""}
              onChange={(v) =>
                onChange({ ...config, price: v === "" ? "" : Number(v) })
              }
              placeholder="50"
            />
          </Field>
        </div>
        <div className="w-28">
          <Field label="العملة">
            <select
              value={str(config.currency) || "USD"}
              onChange={(e) => onChange({ ...config, currency: e.target.value })}
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              {Object.keys(SUPPORTED_CURRENCIES).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        الدفع يعمل بمزوّد تجريبيّ (mock) الآن — يُستبدل بمزوّد حقيقيّ لاحقاً.
      </p>
    </div>
  );
}
