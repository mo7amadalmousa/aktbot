import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { asRecord, str } from "@/lib/public/block-config";
import type { CampaignType, CampaignStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const TYPES = ["SALE", "PERFORMANCE", "UGC"];
const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ENDED"];

// ملف العلامة للمستخدم الحاليّ (ملكية).
async function requireBrand(userId: string, role: string) {
  if (role !== "BRAND" && role !== "ADMIN") return null;
  return prisma.brandProfile.findUnique({ where: { userId }, select: { id: true } });
}

// POST — إنشاء حملة (هيكل أساسيّ · ن18 يكمّلها).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const brand = await requireBrand(session.sub, session.role);
  if (!brand) {
    return NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const b = asRecord(body);
  const title = str(b.title).trim().slice(0, 140);
  if (!title) {
    return NextResponse.json({ ok: false, error: "عنوان الحملة مطلوب." }, { status: 422 });
  }
  const typeRaw = str(b.type).toUpperCase();
  const type = (TYPES.includes(typeRaw) ? typeRaw : "SALE") as CampaignType;
  const statusRaw = str(b.status).toUpperCase();
  const status = (STATUSES.includes(statusRaw) ? statusRaw : "DRAFT") as CampaignStatus;

  const campaign = await prisma.campaign.create({
    data: { brandId: brand.id, title, type, status },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: campaign.id });
}
