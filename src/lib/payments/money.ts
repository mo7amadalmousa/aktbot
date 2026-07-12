// ── العملة والمبالغ (minor units) ─────────────────────────────────────
// تُخزَّن المبالغ دائماً كأصغر وحدة (int) لتفادي أخطاء الفاصلة العائمة.

export interface CurrencyInfo {
  code: string;
  symbol: string;
  minorFactor: number; // 100 لعملات ذات خانتين عشريّتين
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$", minorFactor: 100, decimals: 2 },
  TRY: { code: "TRY", symbol: "₺", minorFactor: 100, decimals: 2 },
};

export const DEFAULT_CURRENCY = "USD";

export function isSupportedCurrency(code: unknown): code is string {
  return typeof code === "string" && code in SUPPORTED_CURRENCIES;
}

// تحويل مبلغ رئيسيّ (مثل 149.99) إلى minor units (14999).
export function toMinor(major: number, currency: string): number {
  const info = SUPPORTED_CURRENCIES[currency] ?? SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];
  return Math.round(major * info.minorFactor);
}

// تنسيق minor units للعرض (14999 USD → "$149.99").
export function formatMoney(minor: number, currency: string): string {
  const info = SUPPORTED_CURRENCIES[currency] ?? SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];
  const major = minor / info.minorFactor;
  return `${info.symbol}${major.toFixed(info.decimals)}`;
}
