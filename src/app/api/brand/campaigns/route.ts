import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeCampaignInput, CampaignError } from "@/lib/campaign/config";
import type { CampaignType, CampaignStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

// ملف العلامة للمستخدم الحاليّ (ملكية).
async function requireBrand(userId: string, role: string) {
  if (role !== "BRAND" && role !== "ADMIN") return null;
  return prisma.brandProfile.findUnique({ where: { userId }, select: { id: true } });
}

// GET — حملات العلامة (للوحتها).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  const brand = await requireBrand(session.sub, session.role);
  if (!brand) return NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 });
  const campaigns = await prisma.campaign.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, type: true, status: true },
  });
  return NextResponse.json({ ok: true, campaigns });
}

// POST — إنشاء حملة كاملة (النوع + الميزانية + الشروط + إعداد الدفع).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  const brand = await requireBrand(session.sub, session.role);
  if (!brand) return NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  let clean;
  try {
    clean = sanitizeCampaignInput(body);
  } catch (e) {
    if (e instanceof CampaignError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 422 });
    }
    throw e;
  }

  // الحالة الابتدائيّة: DRAFT (أو ACTIVE إن طُلب صراحةً).
  const wantActive = String((body as Record<string, unknown>).status ?? "").toUpperCase() === "ACTIVE";
  const status: CampaignStatus = wantActive ? "ACTIVE" : "DRAFT";

  const campaign = await prisma.campaign.create({
    data: {
      brandId: brand.id,
      title: clean.title,
      type: clean.type as CampaignType,
      status,
      description: clean.description,
      brief: clean.brief,
      coverImage: clean.coverImage,
      currency: clean.currency,
      budgetAmount: clean.budgetAmount,
      startAt: clean.startAt,
      endAt: clean.endAt,
      targetUrl: clean.targetUrl,
      requirements: clean.requirements as object,
      payoutConfig: clean.payoutConfig as object,
      usageRightsWanted: clean.usageRightsWanted,
      usageRightsBudget: clean.usageRightsBudget,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: campaign.id });
}
