"use client";

import Link from "next/link";
import { Field, TextInput, TextArea } from "@/components/dashboard/field";
import { str, num } from "@/lib/public/block-config";
import { SUPPORTED_CURRENCIES } from "@/lib/payments/money";

// محرّر بلوكَي الدفع: CONSULTATION (حجز موعد مجانيّ/مدفوع) · PAID_VIDEO (شراء مباشر).
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
  const isConsultation = kind === "consultation";
  const mode = str(config.mode) === "PAID" ? "PAID" : "FREE";
  const meetingType = str(config.meetingType) === "in_person" ? "in_person" : "online";
  const showPrice = !isConsultation || mode === "PAID";

  return (
    <div className="space-y-3">
      <Field label="العنوان">
        <TextInput
          value={str(config.title)}
          onChange={(v) => onChange({ ...config, title: v })}
          placeholder={isConsultation ? "استشارة خاصّة" : "فيديو خاص"}
        />
      </Field>
      <Field label="الوصف">
        <TextArea
          value={str(config.description)}
          onChange={(v) => onChange({ ...config, description: v })}
          placeholder="ماذا يحصل عليه المشتري؟"
        />
      </Field>

      {isConsultation ? (
        <>
          <Field label="نوع الاستشارة">
            <div className="grid grid-cols-2 gap-2">
              {(["FREE", "PAID"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChange({ ...config, mode: m })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    mode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {m === "FREE" ? "مجانيّة" : "مدفوعة"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="نوع اللقاء">
            <select
              value={meetingType}
              onChange={(e) => onChange({ ...config, meetingType: e.target.value })}
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="online">أونلاين</option>
              <option value="in_person">حضوريّ</option>
            </select>
          </Field>

          {meetingType === "online" ? (
            <Field label="رابط اللقاء (اختياري)" hint="Zoom / Meet — يظهر بعد التأكيد">
              <TextInput
                type="url"
                value={str(config.meetingLink)}
                onChange={(v) => onChange({ ...config, meetingLink: v })}
                placeholder="https://meet.google.com/…"
              />
            </Field>
          ) : null}

          <Field label="تعليمات للحاجز (اختياري)">
            <TextArea
              value={str(config.instructions)}
              onChange={(v) => onChange({ ...config, instructions: v })}
              placeholder="ماذا يُحضّر العميل قبل الجلسة؟"
            />
          </Field>

          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
            المواعيد المتاحة تُبنى من{" "}
            <Link href="/dashboard/availability" className="text-primary hover:underline">
              إعدادات التوفّر
            </Link>{" "}
            (أيام/ساعات · مدّة الجلسة · المنطقة الزمنية).
          </p>
        </>
      ) : null}

      {showPrice ? (
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
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        الدفع يعمل بمزوّد تجريبيّ (mock) الآن — يُستبدل بمزوّد حقيقيّ لاحقاً.
      </p>
    </div>
  );
}
