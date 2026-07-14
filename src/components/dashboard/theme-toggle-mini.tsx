"use client";

import { useEffect, useState } from "react";
import { Waves, Sun } from "lucide-react";

// مبدّل وضع مكتفٍ ذاتيّاً لداشبورد المبدع (بلا i18n — الداشبورد عربيّ).
// نفس آليّة الكونسول (.dark + localStorage + سكربت no-flash). قاع/سطح المحيط.
export function ThemeToggleMini() {
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
      title={dark ? "سطح المحيط" : "قاع المحيط"}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
    >
      {dark ? <Waves className="size-4 text-primary" /> : <Sun className="size-4 text-amber-500" />}
      <span>{dark ? "قاع المحيط" : "سطح المحيط"}</span>
    </button>
  );
}
