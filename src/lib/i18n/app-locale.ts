import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

// لغة منطقة app (لوحات التحكّم) — من كوكي (لا مسار كاللاندينغ). افتراضيّ AR.
export const LOCALE_COOKIE = "aktbot_locale";

export async function getAppLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return v && isLocale(v) ? v : DEFAULT_LOCALE;
}
