import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { asRecord, str } from "@/lib/public/block-config";
import type { CampaignStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ENDED"];

// يحمّل حملةً مملوكة للعلامة صاحبة الجلسة (ملكية).
async function loadOwnedCampaign(id: string, userId: string, role: string) {
  if (role !== "BRAND" && role !== "ADMIN") return null;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, brand: { select: { userId: true } } },
  });
  if (!campaign) return null;
  if (role !== "ADMIN" && campaign.brand.userId !== userId) return null;
  return campaign;
}

// PUT — تعديل الحملة (العنوان/الحالة). تغيير الحالة يفعّل/يوقف الإسناد.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  const { id } = await params;
  const campaign = await loadOwnedCampaign(id, session.sub, session.role);
  if (!campaign) return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const b = asRecord(body);
  const data: { title?: string; status?: CampaignStatus } = {};
  const title = str(b.title).trim().slice(0, 140);
  if (title) data.title = title;
  const statusRaw = str(b.status).toUpperCase();
  if (STATUSES.includes(statusRaw)) data.status = statusRaw as CampaignStatus;

  await prisma.campaign.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
