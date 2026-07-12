"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/types";

// Provider معياريّ للمنصّة كلها — يحمل اللغة الحاليّة وكامل الرسائل (كل النطاقات).
// النطاق يُختار عند الاستهلاك: useMessages().landing / .dashboard (لاحقاً).

interface I18nValue {
  locale: Locale;
  messages: Messages;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

export function useMessages(): Messages {
  return useI18n().messages;
}
