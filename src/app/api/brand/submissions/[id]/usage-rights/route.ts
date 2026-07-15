import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { minUsageFee } from "@/lib/campaign/ugc";
import { sanitizeUsageRightInput, UgcError } from "@/lib/campaign/ugc-input";
import { sendUsageRightRequestEmail } from "@/lib/email";
import { formatMoney } from "@/lib/payments/money";
import { USAGE_SCOPE_LABEL } from "@/lib/campaign/labels";
import type { UsageScope } from "@/generated/prisma/enums";

export const runtime = "nodejs";

// العلامة تطلب/تجدّد حقوق استخدام لتسليم مقبول — أجر ≥ الحدّ الأدنى (يضمن العمولة · 422).
// موحّد: إن وُجد حقّ سابق (حيّ/منتهٍ) يُربَط الجديد به (renewedFromId · دخل متكرّر · لا
// تعديل للقديم). لا يُنشأ مستحقّ الآن — يُنشأ عند قبول المبدع.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  if (session.role !== "BRAND" && session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const sub = await prisma.contentSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      campaign: {
        select: { title: true, currency: true, usageRightsWanted: true, brand: { select: { userId: true, brandName: true } } },
      },
      creatorProfile: { select: { displayName: true, user: { select: { email: true } } } },
      usageRights: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      },
    },
  });
  if (!sub) return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  if (session.role !== "ADMIN" && sub.campaign.brand.userId !== session.sub) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }
  if (sub.status !== "APPROVED" && sub.status !== "AUTO_APPROVED") {
    return NextResponse.json(
      { ok: false, error: "حقوق الاستخدام تُطلَب للمحتوى المقبول فقط." },
      { status: 422 },
    );
  }
  const latest = sub.usageRights[0] ?? null;
  if (latest && latest.status === "REQUESTED") {
    return NextResponse.json({ ok: false, error: "هناك طلب حقوق معلّق بالفعل." }, { status: 409 });
  }

  const currency = sub.campaign.currency ?? "USD";
  const minFee = await minUsageFee(currency);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  let clean;
  try {
    clean = sanitizeUsageRightInput(body, currency, minFee);
  } catch (e) {
    if (e instanceof UgcError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 422 });
    }
    throw e;
  }

  // حقّ جديد REQUESTED (تجديد إن وُجد سابق) — لا تعديل للقديم.
  const created = await prisma.usageRight.create({
    data: {
      submissionId: sub.id,
      status: "REQUESTED",
      feeAmount: clean.feeAmount,
      currency,
      durationDays: clean.durationDays,
      channels: clean.channels,
      scope: clean.scope as UsageScope,
      renewedFromId: latest ? latest.id : null,
    },
    select: { id: true },
  });

  await sendUsageRightRequestEmail({
    creatorName: sub.creatorProfile.displayName,
    creatorEmail: sub.creatorProfile.user.email,
    campaignTitle: sub.campaign.title,
    brandName: sub.campaign.brand.brandName,
    feeLabel: formatMoney(clean.feeAmount, currency),
    durationDays: clean.durationDays,
    scopeLabel: USAGE_SCOPE_LABEL[clean.scope] ?? clean.scope,
  }).catch(() => {});

  return NextResponse.json({ ok: true, usageRightId: created.id, renewal: Boolean(latest) });
}
