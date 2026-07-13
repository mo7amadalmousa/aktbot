// ── العملة والمبالغ (minor units) ─────────────────────────────────────
// تُخزَّن المبالغ دائماً كأصغر وحدة (int) لتفادي أخطاء الفاصلة العائمة.
// 🔴 كل عملة لها معاملها الخاصّ (minorFactor = 10^decimals) — لا ×100 ثابت.
// JOD ثلاث منازل عشريّة (×1000)؛ الباقي منزلتان (×100).

export interface CurrencyInfo {
  code: string;
  symbol: string;
  nameAr: string;
  decimals: number; // عدد المنازل العشريّة
  minorFactor: number; // 10^decimals
}

// المصدر الواحد للعملات (الترتيب مقصود للعرض).
export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  SAR: { code: "SAR", symbol: "ر.س", nameAr: "ريال سعوديّ", decimals: 2, minorFactor: 100 },
  AED: { code: "AED", symbol: "د.إ", nameAr: "درهم إماراتيّ", decimals: 2, minorFactor: 100 },
  SYP: { code: "SYP", symbol: "ل.س", nameAr: "ليرة سوريّة", decimals: 2, minorFactor: 100 },
  TRY: { code: "TRY", symbol: "₺", nameAr: "ليرة تركيّة", decimals: 2, minorFactor: 100 },
  USD: { code: "USD", symbol: "$", nameAr: "دولار أمريكيّ", decimals: 2, minorFactor: 100 },
  QAR: { code: "QAR", symbol: "ر.ق", nameAr: "ريال قطريّ", decimals: 2, minorFactor: 100 },
  JOD: { code: "JOD", symbol: "د.أ", nameAr: "دينار أردنيّ", decimals: 3, minorFactor: 1000 },
  EGP: { code: "EGP", symbol: "ج.م", nameAr: "جنيه مصريّ", decimals: 2, minorFactor: 100 },
  EUR: { code: "EUR", symbol: "€", nameAr: "يورو", decimals: 2, minorFactor: 100 },
  GBP: { code: "GBP", symbol: "£", nameAr: "جنيه إسترلينيّ", decimals: 2, minorFactor: 100 },
};

export const DEFAULT_CURRENCY = "USD";

export function isSupportedCurrency(code: unknown): code is string {
  return typeof code === "string" && code in SUPPORTED_CURRENCIES;
}

// معلومات عملة (أو الافتراضيّة إن غير مدعومة).
export function currencyInfo(currency: string): CurrencyInfo {
  return SUPPORTED_CURRENCIES[currency] ?? SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];
}

// قائمة العملات للمنتقيات (بالترتيب المعرّف).
export function currencyList(): CurrencyInfo[] {
  return Object.values(SUPPORTED_CURRENCIES);
}

// خطوة الإدخال حسب منازل العملة (0.01 أو 0.001 لـJOD).
export function minorStep(currency: string): string {
  return (1 / currencyInfo(currency).minorFactor).toString();
}

// تحويل مبلغ رئيسيّ (مثل 149.99) إلى minor units — بمعامل العملة.
export function toMinor(major: number, currency: string): number {
  return Math.round(major * currencyInfo(currency).minorFactor);
}

// تحويل minor units إلى مبلغ رئيسيّ (رقم) — بمعامل العملة. للعرض في حقول الإدخال.
export function fromMinor(minor: number, currency: string): number {
  return minor / currencyInfo(currency).minorFactor;
}

// تنسيق minor units للعرض (14999 USD → "$149.99" · 19999 JOD → "د.أ19.999").
export function formatMoney(
  minor: number,
  currency: string,
  locale = "en-US",
): string {
  const info = currencyInfo(currency);
  const major = minor / info.minorFactor;
  let num: string;
  try {
    num = new Intl.NumberFormat(locale, {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    }).format(major);
  } catch {
    num = major.toFixed(info.decimals);
  }
  return `${info.symbol}${num}`;
}
