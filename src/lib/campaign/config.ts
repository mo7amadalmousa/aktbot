import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { safeHref } from "@/lib/public/safe-url";
import { isManagedMediaUrl } from "@/lib/storage";
import { isSupportedCurrency, toMinor } from "@/lib/payments/money";

// ── إعداد/تنقية الحملة ─────────────────────────────────────────────────
// قرار البنية: payoutConfig = JSON مرن (لا أعمدة لكل نوع) — يتوسّع دون migration.
// SALE {creatorBps|fixedPerSale} · PERFORMANCE {cpcMinor} · UGC {fixedPerContent}.
export class CampaignError extends Error {}

export type CampaignKind = "SALE" | "PERFORMANCE" | "UGC";
const KINDS: CampaignKind[] = ["SALE", "PERFORMANCE", "UGC"];

export type CampaignStatusT = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";

// انتقالات الحالة المسموحة (لا قفز غير منطقيّ · ENDED نهائيّة).
const TRANSITIONS: Record<CampaignStatusT, CampaignStatusT[]> = {
  DRAFT: ["ACTIVE", "ENDED"],
  ACTIVE: ["PAUSED", "ENDED"],
  PAUSED: ["ACTIVE", "ENDED"],
  ENDED: [],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = TRANSITIONS[from as CampaignStatusT];
  return Boolean(allowed && allowed.includes(to as CampaignStatusT));
}

function imageUrl(raw: unknown): string | null {
  const s = safeHref(raw);
  if (!s) return null;
  if (isManagedMediaUrl(s)) return s;
  if (/^https?:\/\//.test(s)) return s;
  return null;
}
function webUrl(raw: unknown): string | null {
  const s = safeHref(raw);
  return s && /^https?:\/\//.test(s) ? s : null;
}
function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface PayoutConfig {
  creatorBps?: number; // SALE
  fixedPerSale?: number; // SALE (minor)
  cpcMinor?: number; // PERFORMANCE (لكل نقرة)
  fixedPerContent?: number; // UGC (minor)
}

export interface CleanCampaign {
  type: CampaignKind;
  title: string;
  description: string | null;
  brief: string | null;
  coverImage: string | null;
  currency: string;
  budgetAmount: number | null; // minor
  startAt: Date | null;
  endAt: Date | null;
  targetUrl: string | null;
  requirements: { items: string[] };
  payoutConfig: PayoutConfig;
  // حقوق الاستخدام (UGC) — شفافية مسبقة للمبدع + سقف مستقلّ.
  usageRightsWanted: boolean;
  usageRightsBudget: number | null; // minor
}

// يبني/يتحقّق payoutConfig حسب النوع (القيَم minor بعملة الحملة).
function buildPayout(type: CampaignKind, c: Record<string, unknown>, currency: string): PayoutConfig {
  if (type === "SALE") {
    const bps = num(c.creatorBps); // نقاط أساس (10% = 1000)
    const fixed = num(c.fixedPerSale); // major
    if (bps !== null && bps > 0) {
      if (bps > 10000) throw new CampaignError("نسبة المبدع يجب أن تكون بين 0 و100.");
      return { creatorBps: Math.round(bps) };
    }
    if (fixed !== null && fixed > 0) return { fixedPerSale: toMinor(fixed, currency) };
    throw new CampaignError("حملة المبيعات تتطلّب نسبة للمبدع أو مبلغاً ثابتاً لكل بيعة.");
  }
  if (type === "PERFORMANCE") {
    const cpc = num(c.cpc); // major لكل نقرة
    if (cpc === null || cpc <= 0) throw new CampaignError("حملة الأداء تتطلّب سعراً لكل نقرة (CPC).");
    return { cpcMinor: toMinor(cpc, currency) };
  }
  // UGC
  const fpc = num(c.fixedPerContent); // major لكل محتوى مقبول
  if (fpc === null || fpc <= 0) throw new CampaignError("حملة المحتوى تتطلّب مبلغاً لكل محتوى مقبول.");
  return { fixedPerContent: toMinor(fpc, currency) };
}

export function sanitizeCampaignInput(raw: unknown): CleanCampaign {
  const c = asRecord(raw);
  const typeRaw = str(c.type).toUpperCase();
  const type = (KINDS as string[]).includes(typeRaw) ? (typeRaw as CampaignKind) : "SALE";

  const title = str(c.title).trim().slice(0, 140);
  if (!title) throw new CampaignError("عنوان الحملة مطلوب.");

  const currency = str(c.currency) || "USD";
  if (!isSupportedCurrency(currency)) throw new CampaignError("عملة غير مدعومة.");

  const budgetMajor = num(c.budget);
  let budgetAmount: number | null = null;
  if (budgetMajor !== null && budgetMajor > 0) budgetAmount = toMinor(budgetMajor, currency);

  const startAt = parseDate(c.startAt);
  const endAt = parseDate(c.endAt);
  if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
    throw new CampaignError("تاريخ النهاية يجب أن يكون بعد البداية.");
  }

  const targetUrl = type === "SALE" ? webUrl(c.targetUrl) : null;
  const items = arr(c.requirements)
    .map((x) => str(x).slice(0, 200))
    .filter(Boolean)
    .slice(0, 20);

  // حقوق الاستخدام لحملات UGC فقط (شفافية مسبقة).
  const usageRightsWanted = type === "UGC" && Boolean(c.usageRightsWanted);
  let usageRightsBudget: number | null = null;
  if (usageRightsWanted) {
    const urb = num(c.usageRightsBudget);
    if (urb !== null && urb > 0) usageRightsBudget = toMinor(urb, currency);
  }

  return {
    type,
    title,
    description: str(c.description).slice(0, 1000) || null,
    brief: str(c.brief).slice(0, 2000) || null,
    coverImage: imageUrl(c.coverImage),
    currency,
    budgetAmount,
    startAt,
    endAt,
    targetUrl,
    requirements: { items },
    payoutConfig: buildPayout(type, c, currency),
    usageRightsWanted,
    usageRightsBudget,
  };
}

// ── حسابات المستحقات ──────────────────────────────────────────────────
export function campaignRemaining(budget: number | null, spent: number): number {
  if (budget === null) return Number.POSITIVE_INFINITY; // بلا سقف
  return Math.max(0, budget - spent);
}

// مستحقّ المبدع من بيعة (minor). fixedPerSale يفوز النسبة إن حُدّد.
export function computeSalePayout(orderAmount: number, cfg: PayoutConfig): number {
  if (typeof cfg.fixedPerSale === "number") return cfg.fixedPerSale;
  if (typeof cfg.creatorBps === "number") {
    return Math.round((orderAmount * cfg.creatorBps) / 10000);
  }
  return 0;
}
