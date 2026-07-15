"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type Audience = "brands" | "creators";

interface AudienceCtx {
  audience: Audience;
  setAudience: (a: Audience) => void;
}

const Ctx = createContext<AudienceCtx>({ audience: "brands", setAudience: () => {} });

export function useAudience() {
  return useContext(Ctx);
}

// حالة الجمهور (علامات/مبدعون) — تبديل فوريّ SPA بلا إعادة تحميل.
// القرار: الافتراضيّ «العلامات» (اللاندينغ أداة بيع B2B) · قابل للتبديل فوراً.
export function AudienceProvider({ children }: { children: React.ReactNode }) {
  const [audience, setAudienceState] = useState<Audience>("brands");

  const setAudience = useCallback((a: Audience) => {
    setAudienceState(a);
    // تمرير ناعم لأعلى المحتوى عند التبديل (بلا قفزة مربكة · لا إعادة تحميل).
    if (typeof window !== "undefined") {
      const el = document.getElementById("audience-panels");
      const top = el ? el.getBoundingClientRect().top + window.scrollY - 72 : 0;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }, []);

  return <Ctx.Provider value={{ audience, setAudience }}>{children}</Ctx.Provider>;
}
