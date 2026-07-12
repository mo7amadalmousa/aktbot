"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Tag } from "lucide-react";
import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { safeHref, safeCssUrl } from "@/lib/public/safe-url";
import { ResponsiveImage } from "@/components/public/responsive-image";

// DISCOUNT: بطاقات كوبونات مع زرّ نسخ + عدّاد. متكيّف مع القالب (--pp-*).
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  // fallback: textarea + execCommand (سياق غير آمن/متصفّح قديم)
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function DiscountBlock({
  config,
  blockId,
}: {
  config: unknown;
  blockId?: string;
}) {
  const c = asRecord(config);
  const title = str(c.title);
  const showCount = c.showCount !== false;
  const coupons = arr(c.coupons)
    .map((cp) => {
      const r = asRecord(cp);
      return {
        id: str(r.id),
        brandName: str(r.brandName) || "خصم",
        description: str(r.description),
        code: str(r.code),
        logoUrl: safeCssUrl(r.logoUrl),
        href: safeHref(r.url),
        copyCount: num(r.copyCount) ?? 0,
      };
    })
    .filter((cp) => cp.code || cp.brandName);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  if (coupons.length === 0) return null;

  const onCopy = async (couponId: string, code: string) => {
    if (!code) return;
    const ok = await copyToClipboard(code);
    if (!ok) return;
    setCopiedId(couponId);
    setTimeout(() => setCopiedId((v) => (v === couponId ? null : v)), 1400);
    setCounts((m) => ({ ...m, [couponId]: (m[couponId] ?? 0) + 1 }));
    if (blockId) {
      fetch("/api/blocks/discount/copy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blockId, couponId }),
      }).catch(() => {});
    }
  };

  const cardStyle = {
    background: "var(--pp-surface)",
    borderColor: "var(--pp-surface-border)",
    color: "var(--pp-text)",
    borderRadius: "var(--pp-radius)",
    boxShadow: "var(--pp-shadow)",
  } as React.CSSProperties;

  return (
    <div className="space-y-3">
      {title ? (
        <p className="text-sm font-bold" style={{ color: "var(--pp-text)" }}>
          {title}
        </p>
      ) : null}

      {coupons.map((cp) => {
        const copied = copiedId === cp.id;
        const displayCount = (counts[cp.id] ?? 0) + cp.copyCount;
        return (
          <div key={cp.id} className="border p-4 text-center" style={cardStyle}>
            <div className="mx-auto mb-2 flex size-11 items-center justify-center overflow-hidden rounded-full" style={{ background: "color-mix(in oklab, var(--pp-text) 8%, transparent)" }}>
              {cp.logoUrl ? (
                <ResponsiveImage url={cp.logoUrl} variant="gallery" alt="" className="size-full object-cover" sizes="44px" />
              ) : (
                <Tag className="size-5" style={{ opacity: 0.6 }} />
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <p className="font-bold">{cp.brandName}</p>
              {cp.href ? (
                <a href={cp.href} target="_blank" rel="noopener noreferrer nofollow sponsored" aria-label="فتح المتجر" style={{ color: "var(--pp-accent)" }}>
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </div>
            {cp.description ? (
              <p className="mt-0.5 text-xs" style={{ opacity: 0.7 }}>
                {cp.description}
              </p>
            ) : null}

            {cp.code ? (
              <button
                type="button"
                onClick={() => onCopy(cp.id, cp.code)}
                className="mt-3 flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm font-bold"
                style={{
                  background: "var(--pp-text)",
                  color: "var(--pp-surface)",
                  borderRadius: "calc(var(--pp-radius) * 0.7)",
                }}
              >
                <span className="tracking-wider">{cp.code}</span>
                <span className="flex items-center gap-1 text-xs opacity-80">
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "نُسخ" : "نسخ"}
                </span>
              </button>
            ) : null}

            {showCount && displayCount > 0 ? (
              <p className="mt-1.5 text-[11px]" style={{ opacity: 0.6 }}>
                نُسخ {displayCount.toLocaleString("en-US")} مرة
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
