"use client";

import { useState } from "react";
import { X } from "lucide-react";

// زرّ ثابت أسفل الشاشة — يحترم safe-area، قابل للإخفاء، لا يغطّي المحتوى (padding في الغلاف).
export function StickyCta({ label, href }: { label: string; href: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto w-full max-w-xl px-4 pb-3">
        <div
          className="flex items-center gap-1 rounded-2xl p-1 shadow-xl"
          style={{ background: "var(--pp-cta-bg)" }}
        >
          <a
            href={href.startsWith("/") || href.startsWith("http") ? href : "#"}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex-1 rounded-xl px-5 py-3 text-center text-sm font-black"
            style={{ color: "var(--pp-cta-text)" }}
          >
            {label}
          </a>
          <button
            type="button"
            aria-label="إخفاء"
            onClick={() => setHidden(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ color: "var(--pp-cta-text)", opacity: 0.7 }}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
