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
          className="flex items-center gap-1 rounded-full border p-1 shadow-xl backdrop-blur"
          style={{
            background: "var(--pp-btn-bg)",
            borderColor: "var(--pp-btn-border)",
          }}
        >
          <a
            href={href.startsWith("/") || href.startsWith("http") ? href : "#"}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex-1 rounded-full px-5 py-2.5 text-center text-sm font-bold"
            style={{ color: "var(--pp-btn-text)" }}
          >
            {label}
          </a>
          <button
            type="button"
            aria-label="إخفاء"
            onClick={() => setHidden(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ color: "var(--pp-btn-text)", opacity: 0.75 }}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
