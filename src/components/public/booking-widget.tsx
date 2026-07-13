"use client";

import { useState } from "react";
import { CalendarClock, Video, MapPin } from "lucide-react";

interface Slot {
  startISO: string;
  endISO: string;
  timeLabel: string;
}
interface DaySlots {
  dateStr: string;
  dayLabel: string;
  slots: Slot[];
}

export function BookingWidget({
  blockId,
  mode,
  priceLabel,
  meetingType,
  timezone,
  days,
  error,
}: {
  blockId: string;
  mode: "FREE" | "PAID";
  priceLabel: string | null;
  meetingType: "online" | "in_person";
  timezone: string;
  days: DaySlots[];
  error?: string;
}) {
  const [activeDay, setActiveDay] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const day = days[activeDay];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {meetingType === "online" ? (
            <Video className="size-3.5" />
          ) : (
            <MapPin className="size-3.5" />
          )}
          {meetingType === "online" ? "أونلاين" : "حضوريّ"}
        </span>
        <span>· المنطقة الزمنية: {timezone}</span>
        {mode === "PAID" && priceLabel ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
            {priceLabel}
          </span>
        ) : (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
            مجانيّ
          </span>
        )}
      </div>

      {error ? (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {days.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          <CalendarClock className="mx-auto mb-2 size-6 opacity-60" />
          لا مواعيد متاحة حالياً. عُد لاحقاً.
        </div>
      ) : (
        <>
          {/* اختيار اليوم */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {days.map((d, i) => (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => {
                  setActiveDay(i);
                  setSelected(null);
                }}
                className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                  i === activeDay
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {d.dayLabel}
                <span className="mt-0.5 block text-[10px] opacity-70">
                  {d.slots.length} مواعيد
                </span>
              </button>
            ))}
          </div>

          {/* اختيار الموعد */}
          <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {day?.slots.map((s) => (
              <button
                key={s.startISO}
                type="button"
                onClick={() => setSelected(s.startISO)}
                className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                  selected === s.startISO
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {s.timeLabel}
              </button>
            ))}
          </div>

          {/* بيانات الحاجز + إرسال */}
          <form method="post" action="/api/book" className="space-y-3">
            <input type="hidden" name="blockId" value={blockId} />
            <input type="hidden" name="startISO" value={selected ?? ""} />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-foreground">
                الاسم
              </span>
              <input
                name="buyerName"
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="اسمك"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-foreground">
                البريد الإلكتروني
              </span>
              <input
                name="buyerEmail"
                type="email"
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="you@example.com"
              />
            </label>
            <button
              type="submit"
              disabled={!selected}
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {!selected
                ? "اختر موعداً أولاً"
                : mode === "PAID"
                  ? `المتابعة للدفع — ${priceLabel}`
                  : "تأكيد الحجز (مجانيّ)"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
