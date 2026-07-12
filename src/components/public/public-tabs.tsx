"use client";

import { useState, type ReactNode } from "react";

// تبويبات العرض — كل اللوحات في DOM (SSR) فتُفهرَس؛ التبديل بصريّ فقط (hidden).
export function PublicTabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="mt-6">
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(i)}
            className="shrink-0 rounded-full border px-4 py-1.5 text-sm font-bold transition-colors"
            style={
              i === active
                ? {
                    background: "var(--pp-cta-bg)",
                    color: "var(--pp-cta-text)",
                    borderColor: "transparent",
                  }
                : {
                    background: "var(--pp-surface)",
                    color: "var(--pp-muted)",
                    borderColor: "var(--pp-surface-border)",
                  }
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} hidden={i !== active}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
