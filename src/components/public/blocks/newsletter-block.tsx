"use client";

import { useState } from "react";
import { asRecord, str } from "@/lib/public/block-config";
import { BlockShell } from "./block-shell";

// NEWSLETTER: نموذج اشتراك عامّ (بلا مصادقة) — honeypot + استجابة موحّدة.
export function NewsletterBlock({
  config,
  username,
  frosted,
}: {
  config: unknown;
  username?: string;
  frosted?: boolean;
}) {
  const c = asRecord(config);
  const title = str(c.title) || "اشترك في نشرتي";
  const description = str(c.description);
  const buttonLabel = str(c.buttonLabel) || "اشتراك";

  const [email, setEmail] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, email, website: hp }),
      });
    } catch {}
    setState("done");
  };

  const inputStyle = {
    background: "color-mix(in oklab, var(--pp-text) 6%, transparent)",
    borderColor: "var(--pp-surface-border)",
    color: "var(--pp-text)",
    borderRadius: "calc(var(--pp-radius) * 0.5)",
  } as React.CSSProperties;

  return (
    <BlockShell frosted={frosted}>
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 text-sm" style={{ opacity: 0.8 }}>
          {description}
        </p>
      ) : null}

      {state === "done" ? (
        <p className="mt-3 text-sm font-medium" style={{ color: "var(--pp-accent)" }}>
          ✓ شكراً! تحقّق من بريدك.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="بريدك الإلكتروني"
            className="h-10 flex-1 border px-3 text-sm outline-none"
            style={inputStyle}
            dir="auto"
          />
          {/* honeypot — مخفيّ عن البشر، يملؤه البوت */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />
          <button
            type="submit"
            disabled={state === "loading"}
            className="h-10 shrink-0 border px-4 text-sm font-semibold disabled:opacity-50"
            style={{
              background: "var(--pp-btn-bg)",
              color: "var(--pp-btn-text)",
              borderColor: "var(--pp-btn-border)",
              borderRadius: "calc(var(--pp-radius) * 0.5)",
            }}
          >
            {buttonLabel}
          </button>
        </form>
      )}
    </BlockShell>
  );
}
