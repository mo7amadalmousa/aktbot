// ── أدوات المنطقة الزمنية وتوليد المواعيد (بلا مكتبة خارجيّة) ──────────
// نعتمد Intl فقط. الفكرة: نمط التوفّر «ساعات حائط» في منطقة المبدع، نحوّل كل
// موعد إلى UTC للتخزين، ونعرضه في أيّ منطقة عبر Intl.

const pad = (n: number) => String(n).padStart(2, "0");

interface ZParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

// أجزاء التاريخ/الوقت لِلحظة مُعطاة داخل منطقة زمنية.
function zonedParts(date: Date, tz: string): ZParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const { type, value } of dtf.formatToParts(date)) p[type] = value;
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour,
    minute: +p.minute,
    second: +p.second,
  };
}

// إزاحة المنطقة عن UTC (بالمِلّي) عند لحظة مُعطاة.
function tzOffsetMs(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}

// تحويل «وقت حائط» في منطقة إلى لحظة UTC.
export function zonedToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  tz: string,
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = tzOffsetMs(new Date(guess), tz);
  return new Date(guess - off);
}

// تنسيق وقت (HH:MM) داخل منطقة.
export function formatTimeInTz(iso: string | Date, tz: string, locale = "ar"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

// تنسيق يوم كامل (اليوم + التاريخ) داخل منطقة.
export function formatDayInTz(iso: string | Date, tz: string, locale = "ar"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

// تنسيق كامل: اليوم + الوقت + اسم المنطقة (للبريد/التأكيد).
export function formatFullInTz(
  iso: string | Date,
  tz: string,
  locale = "ar",
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${formatDayInTz(d, tz, locale)} · ${formatTimeInTz(d, tz, locale)} (${tz})`;
}

export interface WeeklyRange {
  start: string; // "HH:MM"
  end: string;
}
export interface WeeklyDay {
  day: number; // 0=الأحد .. 6=السبت
  ranges: WeeklyRange[];
}

export interface AvailabilityShape {
  timezone: string;
  slotMinutes: number;
  bufferMinutes: number;
  horizonDays: number;
  weekly: WeeklyDay[];
  exceptions: string[]; // "YYYY-MM-DD"
}

export interface Slot {
  startISO: string;
  endISO: string;
  timeLabel: string;
}
export interface DaySlots {
  dateStr: string; // YYYY-MM-DD (بمنطقة المبدع)
  dayLabel: string;
  slots: Slot[];
}

function parseHM(s: string): [number, number] | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = +m[1];
  const mi = +m[2];
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return [h, mi];
}

// يولّد المواعيد الشاغرة = نمط التوفّر ناقص المشغولة، بمنطقة المبدع، ضمن الأفق.
// busyStartISO: مجموعة startAt (ISO UTC) للمواعيد النشطة (تُستبعد).
export function generateSlots(
  av: AvailabilityShape,
  busyStartISO: Set<string>,
  now: Date,
): { timezone: string; days: DaySlots[] } {
  const tz = av.timezone;
  const byDow = new Map<number, WeeklyRange[]>();
  for (const wd of av.weekly ?? []) {
    if (wd && typeof wd.day === "number") byDow.set(wd.day, wd.ranges ?? []);
  }
  const exceptions = new Set(av.exceptions ?? []);
  const slotMs = av.slotMinutes * 60000;
  const stepMin = av.slotMinutes + Math.max(0, av.bufferMinutes);
  const horizon = Math.min(Math.max(1, av.horizonDays), 120);

  const today = zonedParts(now, tz);
  const baseUTC = Date.UTC(today.year, today.month - 1, today.day);
  const days: DaySlots[] = [];

  for (let off = 0; off < horizon; off++) {
    const d = new Date(baseUTC + off * 86400000);
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth() + 1;
    const da = d.getUTCDate();
    const dateStr = `${y}-${pad(mo)}-${pad(da)}`;
    if (exceptions.has(dateStr)) continue;

    const dow = new Date(Date.UTC(y, mo - 1, da)).getUTCDay();
    const ranges = byDow.get(dow) ?? [];
    if (!ranges.length) continue;

    const slots: Slot[] = [];
    for (const r of ranges) {
      const s = parseHM(r.start);
      const e = parseHM(r.end);
      if (!s || !e) continue;
      let cur = s[0] * 60 + s[1];
      const endMin = e[0] * 60 + e[1];
      while (cur + av.slotMinutes <= endMin) {
        const h = Math.floor(cur / 60);
        const mi = cur % 60;
        cur += stepMin;
        const startUtc = zonedToUtc(y, mo, da, h, mi, tz);
        if (startUtc.getTime() <= now.getTime()) continue; // ماضٍ
        const iso = startUtc.toISOString();
        if (busyStartISO.has(iso)) continue; // محجوز
        slots.push({
          startISO: iso,
          endISO: new Date(startUtc.getTime() + slotMs).toISOString(),
          timeLabel: formatTimeInTz(startUtc, tz),
        });
      }
    }
    if (slots.length) {
      const noon = zonedToUtc(y, mo, da, 12, 0, tz);
      days.push({ dateStr, dayLabel: formatDayInTz(noon, tz), slots });
    }
  }
  return { timezone: tz, days };
}
