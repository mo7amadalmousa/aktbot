"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useMessages } from "@/components/i18n/i18n-provider";

// مبدّل الوضع الفاتح/الداكن — class-based (.dark على <html>) + حفظ في localStorage.
// السكربت الوقائيّ في layout يطبّق الوضع قبل الرسم (بلا وميض).
export function ThemeToggle() {
  const t = useMessages().landing.nav;
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("aktbot-theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t.themeLight : t.themeDark}
      title={dark ? t.themeLight : t.themeDark}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
