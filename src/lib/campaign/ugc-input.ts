import { asRecord, str, num } from "@/lib/public/block-config";
import { isSupportedCurrency, toMinor, formatMoney } from "@/lib/payments/money";
import { USAGE_CHANNEL_KEYS } from "@/lib/campaign/labels";

// ── تنقية إدخالات UGC/الحقوق (تحقّق خادميّ — لا واجهة فقط) ─────────────
export class UgcError extends Error {}

const SCOPES = ["ORGANIC", "PAID", "WHITELISTING"] as const;
export type UsageScopeT = (typeof SCOPES)[number];

export function sanitizeCaption(raw: unknown): string | null {
  const s = str(raw).trim().slice(0, 500);
  return s || null;
}

export interface CleanUsageRight {
  feeAmount: number; // minor
  currency: string;
  durationDays: number;
  channels: Record<string, true>;
  scope: UsageScopeT;
}

// يبني/يتحقّق طلب حقوق الاستخدام. الأجر (major) يُحوَّل minor ويُتحقّق ≥ الحدّ الأدنى.
// minFee (minor) يأتي من إعداد المنصّة — التحقّق خادميّ (يضمن العمولة).
export function sanitizeUsageRightInput(
  raw: unknown,
  currency: string,
  minFee: number,
): CleanUsageRight {
  const c = asRecord(raw);
  if (!isSupportedCurrency(currency)) throw new UgcError("عملة غير مدعومة.");

  const feeMajor = num(c.fee);
  if (feeMajor === null || feeMajor <= 0) throw new UgcError("أجر حقوق الاستخدام مطلوب.");
  const feeAmount = toMinor(feeMajor, currency);
  if (feeAmount < minFee) {
    throw new UgcError(
      `أجر حقوق الاستخدام يجب أن يكون ${formatMoney(minFee, currency)} على الأقلّ (الحدّ الأدنى للمنصّة).`,
    );
  }

  const durationDays = Math.round(num(c.durationDays) ?? 0);
  if (durationDays < 1 || durationDays > 3650) {
    throw new UgcError("مدّة الحقوق يجب أن تكون بين يوم و3650 يوماً.");
  }

  const scopeRaw = str(c.scope).toUpperCase();
  const scope = (SCOPES as readonly string[]).includes(scopeRaw)
    ? (scopeRaw as UsageScopeT)
    : "ORGANIC";

  const rawChannels = asRecord(c.channels);
  const channels: Record<string, true> = {};
  for (const key of USAGE_CHANNEL_KEYS) {
    if (rawChannels[key]) channels[key] = true;
  }
  if (Object.keys(channels).length === 0) {
    throw new UgcError("اختر قناة واحدة على الأقلّ لحقوق الاستخدام.");
  }

  return { feeAmount, currency, durationDays, channels, scope };
}

// تنقية خريطة الحدّ الأدنى per-currency (major → minor) لإعداد الأدمن.
export function sanitizeMinFeeMap(raw: unknown): Record<string, number> {
  const c = asRecord(raw);
  const out: Record<string, number> = {};
  for (const [code, val] of Object.entries(c)) {
    if (!isSupportedCurrency(code)) continue;
    const major = num(val);
    if (major === null || major < 0) continue;
    out[code] = toMinor(major, code);
  }
  return out;
}
