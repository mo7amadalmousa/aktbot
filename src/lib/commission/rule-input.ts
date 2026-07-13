import { asRecord, str, num } from "@/lib/public/block-config";
import { toMinor, DEFAULT_CURRENCY } from "@/lib/payments/money";

// تنقية إدخال قاعدة العمولة (خادميّ). النسبة تُدخَل مئويّة وتُخزَّن bps (محايدة
// للعملة). المبلغ الثابت يُدخَل major ويُخزَّن minor بمعامل العملة الافتراضيّة
// (لا حقل عملة على القاعدة — يُوصى بالنسبة المئويّة لتعدّد العملات).
export class RuleError extends Error {}

const SCOPES = ["GLOBAL", "BY_TYPE", "BY_BRAND", "BY_CREATOR", "BY_CAMPAIGN"];
const SALE_TYPES = [
  "CONSULTATION",
  "VIDEO",
  "STORE_DIGITAL",
  "STORE_COURSE",
  "STORE_PHYSICAL",
  "BOOKING",
  "CAMPAIGN",
  "USAGE_RIGHTS",
];

export interface CleanRule {
  scope: string;
  targetId: string | null;
  saleType: string | null;
  percentBps: number | null;
  fixedAmount: number | null;
  priority: number;
  startAt: Date | null;
  endAt: Date | null;
  isActive: boolean;
  label: string | null;
}

function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function sanitizeRule(raw: unknown): CleanRule {
  const c = asRecord(raw);
  const scope = str(c.scope).toUpperCase();
  if (!SCOPES.includes(scope)) throw new RuleError("نطاق غير صالح.");

  let saleType: string | null = null;
  const stRaw = str(c.saleType).toUpperCase();
  if (stRaw) {
    if (!SALE_TYPES.includes(stRaw)) throw new RuleError("نوع بيع غير صالح.");
    saleType = stRaw;
  }
  if (scope === "BY_TYPE" && !saleType) {
    throw new RuleError("قاعدة «حسب النوع» تتطلّب نوع بيع.");
  }

  let targetId: string | null = null;
  if (scope === "BY_CREATOR" || scope === "BY_BRAND" || scope === "BY_CAMPAIGN") {
    targetId = str(c.targetId).trim() || null;
    if (!targetId) throw new RuleError("هذا النطاق يتطلّب معرّف هدف.");
  }

  // النسبة (مئويّة) أو المبلغ الثابت (major) — أحدهما على الأقلّ.
  let percentBps: number | null = null;
  let fixedAmount: number | null = null;
  const percent = num(c.percent);
  const fixedMajor = num(c.fixedAmount);
  if (percent !== null && percent > 0) {
    if (percent > 100) throw new RuleError("النسبة يجب أن تكون بين 0 و100.");
    percentBps = Math.round(percent * 100); // 15 → 1500 bps
  } else if (fixedMajor !== null && fixedMajor > 0) {
    fixedAmount = toMinor(fixedMajor, DEFAULT_CURRENCY); // major → minor (عملة افتراضيّة)
  } else {
    throw new RuleError("أدخل نسبة مئويّة أو مبلغاً ثابتاً أكبر من صفر.");
  }

  const startAt = parseDate(c.startAt);
  const endAt = parseDate(c.endAt);
  if (startAt && endAt && endAt.getTime() < startAt.getTime()) {
    throw new RuleError("تاريخ النهاية قبل البداية.");
  }

  return {
    scope,
    targetId,
    saleType,
    percentBps,
    fixedAmount,
    priority: Math.max(0, Math.floor(num(c.priority) ?? 0)),
    startAt,
    endAt,
    isActive: c.isActive !== false,
    label: str(c.label).slice(0, 120) || null,
  };
}
