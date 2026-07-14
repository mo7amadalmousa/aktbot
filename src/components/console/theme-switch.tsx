"use client";

import { useEffect, useState } from "react";
import { Waves, Sun } from "lucide-react";
import { useMessages } from "@/components/i18n/i18n-provider";

// مبدّل الوضع للكونسول — يعيد استخدام آليّة اللاندينغ (.dark + localStorage +
// سكربت no-flash). التسمية الإبداعية: داكن «قاع المحيط» · فاتح «سطح المحيط».
export function ThemeSwitch() {
  const t = useMessages().admin.theme;
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

  // نعرض اسم الوضع الحاليّ (قاع/سطح) — والنقر يبدّل للآخر.
  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? t.toLight : t.toDark}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      {dark ? <Waves className="size-4 text-primary" /> : <Sun className="size-4 text-amber-500" />}
      <span className="hidden sm:inline">{dark ? t.toDark : t.toLight}</span>
    </button>
  );
}
