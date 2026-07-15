import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { safeHref } from "@/lib/public/safe-url";
import { isManagedMediaUrl } from "@/lib/storage";
import { isSupportedCurrency, toMinor } from "@/lib/payments/money";

// ── الحملة القابلة للتركيب ──────────────────────────────────────────────
// بدل `type` الحصريّ: مكوّنات اختياريّة تُفعَّل معاً، كلٌّ بميزانيّته (لا تسرّب).
// الحملات القائمة تُرحَّل من type إلى المكوّن المكافئ (backfill في الهجرة).
export class CampaignError extends Error {}

export type CampaignKind = "SALE" | "PERFORMANCE" | "UGC";
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

export interface CleanCampaign {
  title: string;
  description: string | null;
  brief: string | null;
  coverImage: string | null;
  currency: string;
  startAt: Date | null;
  endAt: Date | null;
  targetUrl: string | null;
  requirements: { items: string[] };
  type: CampaignKind; // legacy — يُشتقّ من المكوّن الأساسيّ (للعمود القائم)
  // المكوّنات (minor بعملة الحملة)
  contentEnabled: boolean;
  contentBudget: number | null;
  contentPerItem: number | null;
  contentCount: number | null;
  usageRightsEnabled: boolean;
  usageRightsBudget: number | null;
  saleEnabled: boolean;
  saleBudget: number | null;
  saleCreatorBps: number | null;
  saleFixedPerSale: number | null;
  performanceEnabled: boolean;
  performanceBudget: number | null;
  performanceCpc: number | null;
}

function optBudget(raw: unknown, currency: string): number | null {
  const v = num(raw);
  return v !== null && v > 0 ? toMinor(v, currency) : null;
}

export function sanitizeCampaignInput(raw: unknown): CleanCampaign {
  const c = asRecord(raw);

  const title = str(c.title).trim().slice(0, 140);
  if (!title) throw new CampaignError("عنوان الحملة مطلوب.");

  const currency = str(c.currency) || "USD";
  if (!isSupportedCurrency(currency)) throw new CampaignError("عملة غير مدعومة.");

  const startAt = parseDate(c.startAt);
  const endAt = parseDate(c.endAt);
  if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
    throw new CampaignError("تاريخ النهاية يجب أن يكون بعد البداية.");
  }

  const items = arr(c.requirements)
    .map((x) => str(x).slice(0, 200))
    .filter(Boolean)
    .slice(0, 20);

  // ── مكوّن المحتوى ──
  const contentEnabled = Boolean(c.contentEnabled);
  let contentPerItem: number | null = null;
  let contentCount: number | null = null;
  if (contentEnabled) {
    const per = num(c.contentPerItem);
    if (per === null || per <= 0) {
      throw new CampaignError("مكوّن المحتوى يتطلّب أجراً لكل محتوى مقبول.");
    }
    contentPerItem = toMinor(per, currency);
    const cnt = num(c.contentCount);
    if (cnt !== null && cnt > 0) contentCount = Math.round(cnt);
  }

  // ── مكوّن حقوق الاستخدام (الأجر لكل طلب لاحقاً · هنا التفعيل + الميزانية) ──
  const usageRightsEnabled = Boolean(c.usageRightsEnabled);

  // ── مكوّن البيع ──
  const saleEnabled = Boolean(c.saleEnabled);
  let saleCreatorBps: number | null = null;
  let saleFixedPerSale: number | null = null;
  if (saleEnabled) {
    const bps = num(c.saleCreatorBps ?? c.creatorPercent);
    const fixed = num(c.saleFixedPerSale ?? c.fixedPerSale);
    if (bps !== null && bps > 0) {
      const b = Math.round(bps > 100 ? bps : bps * 100); // يقبل bps مباشرة أو نسبة %
      if (b > 10000) throw new CampaignError("نسبة المبدع يجب أن تكون بين 0 و100.");
      saleCreatorBps = b;
    } else if (fixed !== null && fixed > 0) {
      saleFixedPerSale = toMinor(fixed, currency);
    } else {
      throw new CampaignError("مكوّن البيع يتطلّب نسبة للمبدع أو مبلغاً ثابتاً لكل بيعة.");
    }
  }

  // ── مكوّن الأداء ──
  const performanceEnabled = Boolean(c.performanceEnabled);
  let performanceCpc: number | null = null;
  if (performanceEnabled) {
    const cpc = num(c.performanceCpc ?? c.cpc);
    if (cpc === null || cpc <= 0) throw new CampaignError("مكوّن الأداء يتطلّب سعراً لكل نقرة (CPC).");
    performanceCpc = toMinor(cpc, currency);
  }

  if (!contentEnabled && !usageRightsEnabled && !saleEnabled && !performanceEnabled) {
    throw new CampaignError("فعّل مكوّناً واحداً على الأقلّ (محتوى/حقوق/بيع/أداء).");
  }
  // حقوق الاستخدام تتطلّب محتوى (الحقوق على محتوى مقبول).
  if (usageRightsEnabled && !contentEnabled) {
    throw new CampaignError("حقوق الاستخدام تتطلّب تفعيل مكوّن المحتوى.");
  }

  const type: CampaignKind = contentEnabled
    ? "UGC"
    : saleEnabled
      ? "SALE"
      : performanceEnabled
        ? "PERFORMANCE"
        : "SALE";

  return {
    title,
    description: str(c.description).slice(0, 1000) || null,
    brief: str(c.brief).slice(0, 2000) || null,
    coverImage: imageUrl(c.coverImage),
    currency,
    startAt,
    endAt,
    targetUrl: saleEnabled ? webUrl(c.targetUrl) : null,
    requirements: { items },
    type,
    contentEnabled,
    contentBudget: contentEnabled ? optBudget(c.contentBudget, currency) : null,
    contentPerItem,
    contentCount,
    usageRightsEnabled,
    usageRightsBudget: usageRightsEnabled ? optBudget(c.usageRightsBudget, currency) : null,
    saleEnabled,
    saleBudget: saleEnabled ? optBudget(c.saleBudget, currency) : null,
    saleCreatorBps,
    saleFixedPerSale,
    performanceEnabled,
    performanceBudget: performanceEnabled ? optBudget(c.performanceBudget, currency) : null,
    performanceCpc,
  };
}

// حقول Prisma للكتابة (إنشاء/تعديل) — مصدر واحد يمنع نسيان عمود.
export function campaignComponentData(clean: CleanCampaign) {
  return {
    contentEnabled: clean.contentEnabled,
    contentBudget: clean.contentBudget,
    contentPerItem: clean.contentPerItem,
    contentCount: clean.contentCount,
    usageRightsWanted: clean.usageRightsEnabled,
    usageRightsBudget: clean.usageRightsBudget,
    saleEnabled: clean.saleEnabled,
    saleBudget: clean.saleBudget,
    saleCreatorBps: clean.saleCreatorBps,
    saleFixedPerSale: clean.saleFixedPerSale,
    performanceEnabled: clean.performanceEnabled,
    performanceBudget: clean.performanceBudget,
    performanceCpc: clean.performanceCpc,
  };
}

// ── حسابات المستحقات ──────────────────────────────────────────────────
export function campaignRemaining(budget: number | null, spent: number): number {
  if (budget === null) return Number.POSITIVE_INFINITY; // بلا سقف
  return Math.max(0, budget - spent);
}

// مستحقّ المبدع من بيعة (minor). fixedPerSale يفوز النسبة إن حُدّد.
export function computeSalePayout(
  orderAmount: number,
  creatorBps: number | null,
  fixedPerSale: number | null,
): number {
  if (typeof fixedPerSale === "number") return fixedPerSale;
  if (typeof creatorBps === "number") return Math.round((orderAmount * creatorBps) / 10000);
  return 0;
}
