import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

// ── محرّك الإسناد (Attribution) ────────────────────────────────────────
// كل مبدع×حملة له كود ورابط فريدان. الرابط يسجّل CLICK ويضع كوكي إسناد؛ الكود
// يُستخدم عند الشراء. عند PAID يُسجَّل SALE وتُربَط العمولة بالحملة/العلامة.
// S2S-ready: كل المنطق خادميّ (لا يعتمد كوكي طرف ثالث).

export const ATTR_COOKIE = "aktbot_attr"; // = participationId (opaque)
const ATTR_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 يوماً

export function attrCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ATTR_MAX_AGE_SEC,
  };
}

// كود قابل للقراءة: 8 حروف/أرقام (بلا ملتبس). فريد بإعادة التوليد عند التصادم.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(len = 8): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// يولّد كوداً + رابطاً فريدَين (يتحقّق من عدم التصادم في القاعدة).
export async function generateUniqueCodeLink(): Promise<{
  code: string;
  link: string;
}> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode(8);
    const clash = await prisma.campaignParticipation.findFirst({
      where: { OR: [{ uniqueCode: code }, { uniqueLink: `/r/${code}` }] },
      select: { id: true },
    });
    if (!clash) return { code, link: `/r/${code}` };
  }
  // احتمال ضئيل جداً — كود أطول كضمان.
  const code = randomCode(12);
  return { code, link: `/r/${code}` };
}

// إنشاء/ضمان مشاركة مبدع في حملة (فريدة عبر [campaignId, creatorProfileId]).
export async function ensureParticipation(
  campaignId: string,
  creatorProfileId: string,
): Promise<{ id: string; code: string; link: string; created: boolean }> {
  const existing = await prisma.campaignParticipation.findUnique({
    where: { campaignId_creatorProfileId: { campaignId, creatorProfileId } },
    select: { id: true, uniqueCode: true, uniqueLink: true },
  });
  if (existing) {
    return { id: existing.id, code: existing.uniqueCode, link: existing.uniqueLink, created: false };
  }
  const { code, link } = await generateUniqueCodeLink();
  const p = await prisma.campaignParticipation.create({
    data: {
      campaignId,
      creatorProfileId,
      uniqueCode: code,
      uniqueLink: link,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    select: { id: true },
  });
  return { id: p.id, code, link, created: true };
}

// دعوة مبدع لحملة (INVITED) — يولّد كود/رابط لكن لا يُسنِد حتى يقبل المبدع.
export async function inviteParticipation(
  campaignId: string,
  creatorProfileId: string,
): Promise<{ id: string; code: string; link: string; created: boolean; status: string }> {
  const existing = await prisma.campaignParticipation.findUnique({
    where: { campaignId_creatorProfileId: { campaignId, creatorProfileId } },
    select: { id: true, uniqueCode: true, uniqueLink: true, status: true },
  });
  if (existing) {
    return {
      id: existing.id,
      code: existing.uniqueCode,
      link: existing.uniqueLink,
      created: false,
      status: existing.status,
    };
  }
  const { code, link } = await generateUniqueCodeLink();
  const p = await prisma.campaignParticipation.create({
    data: { campaignId, creatorProfileId, uniqueCode: code, uniqueLink: link, status: "INVITED" },
    select: { id: true },
  });
  return { id: p.id, code, link, created: true, status: "INVITED" };
}

// قبول المبدع للدعوة → ACTIVE (يُفعّل الإسناد). idempotent · ملكية.
export async function acceptParticipation(
  participationId: string,
  creatorProfileId: string,
): Promise<{ ok: boolean; code?: string; link?: string }> {
  const p = await prisma.campaignParticipation.findUnique({
    where: { id: participationId },
    select: { id: true, creatorProfileId: true, status: true, uniqueCode: true, uniqueLink: true },
  });
  if (!p || p.creatorProfileId !== creatorProfileId || p.status === "LEFT") {
    return { ok: false };
  }
  if (p.status !== "ACTIVE") {
    await prisma.campaignParticipation.update({
      where: { id: p.id },
      data: { status: "ACTIVE", joinedAt: new Date() },
    });
  }
  return { ok: true, code: p.uniqueCode, link: p.uniqueLink };
}

export interface ClickResult {
  participationId: string;
  active: boolean;
  destinationUsername: string;
}

// تسجيل نقرة على رابط الإسناد. يعيد null إن كان الكود غير معروف.
// يسجّل/يُسنِد فقط إن كانت الحملة نشطة و count=true (مضادّ التضخيم في المستدعي).
export async function recordClick(
  code: string,
  visitorRef: string | null,
  source: string | null,
  count = true,
): Promise<ClickResult | null> {
  const p = await prisma.campaignParticipation.findUnique({
    where: { uniqueCode: code },
    select: {
      id: true,
      status: true,
      campaign: { select: { status: true, type: true } },
      creatorProfile: { select: { username: true } },
    },
  });
  if (!p) return null;
  // نشط = الحملة ACTIVE والمبدع قَبِل الدعوة (participation ACTIVE).
  const active = p.campaign.status === "ACTIVE" && p.status === "ACTIVE";
  if (active && count) {
    await prisma.$transaction([
      prisma.attributionEvent.create({
        data: { participationId: p.id, type: "CLICK", visitorRef, source },
      }),
      prisma.campaignParticipation.update({
        where: { id: p.id },
        data: { clicks: { increment: 1 } },
      }),
    ]);
    // حملة الأداء (PERFORMANCE): مستحقّ CPC لكل نقرة محتسَبة.
    if (p.campaign.type === "PERFORMANCE") {
      const { accruePerformancePayout } = await import("@/lib/campaign/payout");
      await accruePerformancePayout(p.id);
    }
  }
  return {
    participationId: p.id,
    active,
    destinationUsername: p.creatorProfile.username,
  };
}

// يحلّ مرجع إسناد (كوكي/كود) إلى participationId نشط — لوسم الطلب عند الشراء.
export async function resolveActiveParticipationRef(
  cookieVal: string | null | undefined,
  code: string | null | undefined,
): Promise<string | null> {
  if (cookieVal) {
    const p = await prisma.campaignParticipation.findUnique({
      where: { id: cookieVal },
      select: { id: true, status: true, campaign: { select: { status: true } } },
    });
    if (p && p.status === "ACTIVE" && p.campaign.status === "ACTIVE") return p.id;
  }
  if (code) {
    const p = await prisma.campaignParticipation.findUnique({
      where: { uniqueCode: code.toUpperCase() },
      select: { id: true, status: true, campaign: { select: { status: true } } },
    });
    if (p && p.status === "ACTIVE" && p.campaign.status === "ACTIVE") return p.id;
  }
  return null;
}

// عند PAID: يسجّل SALE ويحدّث الأداء المجمّع، ويعيد campaignId/brandId للـLedger.
// idempotent — لا حدث SALE مكرّر لنفس الطلب.
export async function recordSaleAttribution(order: {
  id: string;
  participationId: string | null;
  amount: number;
}): Promise<{ campaignId: string | null; brandId: string | null }> {
  if (!order.participationId) return { campaignId: null, brandId: null };
  const p = await prisma.campaignParticipation.findUnique({
    where: { id: order.participationId },
    select: { id: true, campaign: { select: { id: true, brandId: true } } },
  });
  if (!p) return { campaignId: null, brandId: null };

  const existing = await prisma.attributionEvent.findFirst({
    where: { participationId: p.id, orderId: order.id, type: "SALE" },
    select: { id: true },
  });
  if (!existing) {
    await prisma.$transaction([
      prisma.attributionEvent.create({
        data: {
          participationId: p.id,
          type: "SALE",
          orderId: order.id,
          amount: order.amount,
        },
      }),
      prisma.campaignParticipation.update({
        where: { id: p.id },
        data: {
          sales: { increment: 1 },
          conversions: { increment: 1 },
          salesValue: { increment: order.amount },
        },
      }),
    ]);
  }
  return { campaignId: p.campaign.id, brandId: p.campaign.brandId };
}
