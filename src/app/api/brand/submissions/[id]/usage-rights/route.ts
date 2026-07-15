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

// العلامة تطلب حقوق استخدام لتسليم مقبول — أجر ≥ الحدّ الأدنى للمنصّة (يضمن العمولة).
// التحقّق خادميّ (422 إن أقلّ). لا يُنشأ مستحقّ الآن — يُنشأ عند قبول المبدع.
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
        select: { title: true, currency: true, brand: { select: { userId: true, brandName: true } } },
      },
      creatorProfile: { select: { displayName: true, user: { select: { email: true } } } },
      usageRight: { select: { status: true } },
    },
  });
  if (!sub) return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  if (session.role !== "ADMIN" && sub.campaign.brand.userId !== session.sub) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }
  // الحقوق تُطلَب للمحتوى المقبول فقط.
  if (sub.status !== "APPROVED") {
    return NextResponse.json(
      { ok: false, error: "حقوق الاستخدام تُطلَب للمحتوى المقبول فقط." },
      { status: 422 },
    );
  }
  // لا إعادة طلب فوق حقّ مقبول سارٍ.
  if (sub.usageRight && sub.usageRight.status === "ACCEPTED") {
    return NextResponse.json({ ok: false, error: "حقوق الاستخدام مقبولة بالفعل." }, { status: 409 });
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

  // upsert بالتسليم (صفّ واحد لكل تسليم) — يعيد الطلب لو رُفض/انتهى سابقاً.
  await prisma.usageRight.upsert({
    where: { submissionId: sub.id },
    update: {
      status: "REQUESTED",
      feeAmount: clean.feeAmount,
      currency,
      durationDays: clean.durationDays,
      channels: clean.channels,
      scope: clean.scope as UsageScope,
      requestedAt: new Date(),
      respondedAt: null,
      startAt: null,
      endAt: null,
    },
    create: {
      submissionId: sub.id,
      status: "REQUESTED",
      feeAmount: clean.feeAmount,
      currency,
      durationDays: clean.durationDays,
      channels: clean.channels,
      scope: clean.scope as UsageScope,
    },
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

  return NextResponse.json({ ok: true });
}
