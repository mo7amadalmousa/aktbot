import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import {
  sanitizeCampaignInput,
  campaignComponentData,
  canTransition,
  CampaignError,
} from "@/lib/campaign/config";
import { asRecord, str } from "@/lib/public/block-config";
import type { CampaignStatus, CampaignType } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ENDED"];

// يحمّل حملةً مملوكة للعلامة صاحبة الجلسة (ملكية).
async function loadOwned(id: string, userId: string, role: string) {
  if (role !== "BRAND" && role !== "ADMIN") return null;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, status: true, type: true, currency: true, brand: { select: { userId: true } } },
  });
  if (!campaign) return null;
  if (role !== "ADMIN" && campaign.brand.userId !== userId) return null;
  return campaign;
}

// PUT — تعديل الحملة أو انتقال حالتها (لا قفز غير منطقيّ).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  const { id } = await params;
  const campaign = await loadOwned(id, session.sub, session.role);
  if (!campaign) return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const b = asRecord(body);

  // ── وضع انتقال الحالة ──
  const nextStatus = str(b.status).toUpperCase();
  if (nextStatus && !str(b.title)) {
    if (!STATUSES.includes(nextStatus)) {
      return NextResponse.json({ ok: false, error: "حالة غير صالحة." }, { status: 422 });
    }
    if (nextStatus === campaign.status) return NextResponse.json({ ok: true });
    if (!canTransition(campaign.status, nextStatus)) {
      return NextResponse.json(
        { ok: false, error: `انتقال غير مسموح: ${campaign.status} → ${nextStatus}.` },
        { status: 422 },
      );
    }
    await prisma.campaign.update({
      where: { id },
      data: { status: nextStatus as CampaignStatus },
    });
    return NextResponse.json({ ok: true });
  }

  // ── وضع التعديل الكامل (المكوّنات قابلة للتغيير — التركيب) ──
  let clean;
  try {
    clean = sanitizeCampaignInput(b);
  } catch (e) {
    if (e instanceof CampaignError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 422 });
    }
    throw e;
  }
  await prisma.campaign.update({
    where: { id },
    data: {
      title: clean.title,
      type: clean.type as CampaignType,
      description: clean.description,
      brief: clean.brief,
      coverImage: clean.coverImage,
      currency: clean.currency,
      startAt: clean.startAt,
      endAt: clean.endAt,
      targetUrl: clean.targetUrl,
      requirements: clean.requirements as object,
      ...campaignComponentData(clean),
    },
  });
  return NextResponse.json({ ok: true });
}
