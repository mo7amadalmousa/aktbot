"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, Check, Clock } from "lucide-react";
import { Field, TextInput } from "@/components/dashboard/field";

interface Range {
  start: string;
  end: string;
}
interface DayState {
  enabled: boolean;
  ranges: Range[];
}

const DAY_NAMES = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const TZ_OPTIONS = [
  "UTC",
  "Europe/Istanbul",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Africa/Cairo",
  "Europe/London",
  "America/New_York",
];

export interface AvailabilityInit {
  timezone: string;
  slotMinutes: number;
  bufferMinutes: number;
  horizonDays: number;
  weekly: { day: number; ranges: Range[] }[];
  exceptions: string[];
}

export function AvailabilityEditor({ initial }: { initial: AvailabilityInit | null }) {
  const seed = initial ?? {
    timezone: "Europe/Istanbul",
    slotMinutes: 30,
    bufferMinutes: 0,
    horizonDays: 30,
    weekly: [],
    exceptions: [],
  };

  const initDays: DayState[] = Array.from({ length: 7 }, (_, d) => {
    const w = seed.weekly.find((x) => x.day === d);
    return { enabled: Boolean(w && w.ranges.length), ranges: w?.ranges ?? [] };
  });

  const [timezone, setTimezone] = useState(seed.timezone);
  const [slotMinutes, setSlotMinutes] = useState(String(seed.slotMinutes));
  const [bufferMinutes, setBufferMinutes] = useState(String(seed.bufferMinutes));
  const [horizonDays, setHorizonDays] = useState(String(seed.horizonDays));
  const [days, setDays] = useState<DayState[]>(initDays);
  const [exceptions, setExceptions] = useState<string[]>(seed.exceptions);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tzList = TZ_OPTIONS.includes(timezone) ? TZ_OPTIONS : [timezone, ...TZ_OPTIONS];

  const patchDay = (d: number, patch: Partial<DayState>) =>
    setDays(days.map((x, i) => (i === d ? { ...x, ...patch } : x)));
  const addRange = (d: number) =>
    patchDay(d, { ranges: [...days[d].ranges, { start: "09:00", end: "17:00" }] });
  const setRange = (d: number, ri: number, patch: Partial<Range>) =>
    patchDay(d, {
      ranges: days[d].ranges.map((r, i) => (i === ri ? { ...r, ...patch } : r)),
    });
  const removeRange = (d: number, ri: number) =>
    patchDay(d, { ranges: days[d].ranges.filter((_, i) => i !== ri) });

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    const weekly = days
      .map((x, d) => ({ day: d, ranges: x.enabled ? x.ranges : [] }))
      .filter((x) => x.ranges.length);
    const res = await fetch("/api/creator/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timezone,
        slotMinutes: Number(slotMinutes),
        bufferMinutes: Number(bufferMinutes),
        horizonDays: Number(horizonDays),
        weekly,
        exceptions,
      }),
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setBusy(false);
    if (!d.ok) setError(d.error || "تعذّر الحفظ.");
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="size-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">إعدادات التوفّر</h1>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="المنطقة الزمنية">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              {tzList.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
          <Field label="مدّة الجلسة (دقائق)">
            <TextInput type="number" value={slotMinutes} onChange={setSlotMinutes} placeholder="30" />
          </Field>
          <Field label="الفاصل بين المواعيد (دقائق)">
            <TextInput type="number" value={bufferMinutes} onChange={setBufferMinutes} placeholder="0" />
          </Field>
          <Field label="أفق الحجز (أيام مقدّماً)">
            <TextInput type="number" value={horizonDays} onChange={setHorizonDays} placeholder="30" />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">أيام وساعات العمل</p>
          <div className="space-y-2">
            {days.map((day, d) => (
              <div key={d} className="rounded-xl border border-border p-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => patchDay(d, { enabled: e.target.checked })}
                    className="size-4 accent-[var(--primary,#278A8F)]"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {DAY_NAMES[d]}
                  </span>
                </label>
                {day.enabled ? (
                  <div className="mt-2 space-y-2">
                    {day.ranges.map((r, ri) => (
                      <div key={ri} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={r.start}
                          onChange={(e) => setRange(d, ri, { start: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                        />
                        <span className="text-muted-foreground">—</span>
                        <input
                          type="time"
                          value={r.end}
                          onChange={(e) => setRange(d, ri, { end: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => removeRange(d, ri)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="حذف الفترة"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addRange(d)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Plus className="size-3.5" /> إضافة فترة
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">
            إجازات / استثناءات (تعطيل أيام)
          </p>
          <div className="space-y-2">
            {exceptions.map((ex, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="date"
                  value={ex}
                  onChange={(e) =>
                    setExceptions(exceptions.map((x, j) => (j === i ? e.target.value : x)))
                  }
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setExceptions(exceptions.filter((_, j) => j !== i))}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="حذف"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setExceptions([...exceptions, ""])}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="size-3.5" /> إضافة إجازة
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          {saved ? "حُفظ" : "حفظ التوفّر"}
        </button>
      </div>
    </div>
  );
}
