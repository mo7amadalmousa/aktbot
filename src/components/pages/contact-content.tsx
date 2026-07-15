"use client";

import { useState } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { useMessages, useLocale } from "@/components/i18n/i18n-provider";
import { EditableText } from "@/components/cms/editable";

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function ContactContent() {
  const t = useMessages().landing.pages.contact;
  const locale = useLocale();
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.email.trim() || !f.message.trim()) return;
    setStatus("sending");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, locale }),
    });
    setStatus(res.ok ? "ok" : "err");
    if (res.ok) setF({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
      <EditableText as="h1" field="contact.title" def={t.title} className="block text-4xl font-extrabold tracking-tight text-foreground" />
      <EditableText as="p" field="contact.intro" def={t.intro} className="mt-3 block text-muted-foreground" />

      {status === "ok" ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
          <CheckCircle2 className="size-5" /> {t.success}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-foreground">
            {t.name}
            <input value={f.name} onChange={(e) => set("name", e.target.value)} required className={`mt-1 ${inputCls}`} />
          </label>
          <label className="block text-sm text-foreground">
            {t.email}
            <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} required className={`mt-1 ${inputCls}`} />
          </label>
        </div>
        <label className="block text-sm text-foreground">
          {t.subject}
          <input value={f.subject} onChange={(e) => set("subject", e.target.value)} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-sm text-foreground">
          {t.message}
          <textarea value={f.message} onChange={(e) => set("message", e.target.value)} required rows={5} className={`mt-1 ${inputCls}`} />
        </label>
        {status === "err" ? <p className="text-sm text-destructive">{t.error}</p> : null}
        <button type="submit" disabled={status === "sending"} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {status === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {t.send}
        </button>
      </form>
    </div>
  );
}
