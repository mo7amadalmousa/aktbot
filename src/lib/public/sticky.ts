import { asRecord, str } from "./block-config";
import { safeHref } from "./safe-url";
import type { StickyCta } from "./page-theme";

export interface ResolvedCta {
  label: string;
  href: string;
}

// يحلّ Sticky CTA خادميّاً من بلوك موجود أو إجراء مخصّص. بلوك محذوف/رابط خبيث → null.
export function resolveStickyCta(
  sticky: StickyCta,
  blocks: { id: string; type: string; config: unknown }[],
): ResolvedCta | null {
  if (!sticky.enabled) return null;

  // إجراء مخصّص (label + url)
  if (sticky.url) {
    const href = safeHref(sticky.url);
    if (href && href.startsWith("http")) {
      return { label: sticky.label || "افتح", href };
    }
  }

  // مرجع بلوك
  if (sticky.blockId) {
    const b = blocks.find((x) => x.id === sticky.blockId);
    if (!b) return null; // محذوف → يختفي
    const c = asRecord(b.config);
    if (b.type === "CONSULTATION" || b.type === "PAID_VIDEO") {
      return {
        label: sticky.label || str(c.title) || (b.type === "CONSULTATION" ? "احجز" : "اطلب"),
        href: `/checkout/${b.id}`,
      };
    }
    const href = safeHref(c.url);
    if (href) {
      return { label: sticky.label || str(c.label) || str(c.title) || "افتح", href };
    }
  }

  return null;
}
