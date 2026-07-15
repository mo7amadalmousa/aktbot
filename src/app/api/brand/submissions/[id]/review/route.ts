import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { asRecord, str } from "@/lib/public/block-config";
import { accrueUgcContentPayout } from "@/lib/campaign/ugc";
import { sendSubmissionReviewedEmail } from "@/lib/email";
import { formatMoney } from "@/lib/payments/money";
import { SUBMISSION_STATUS_LABEL } from "@/lib/campaign/labels";
import type { SubmissionStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const ACTION_STATUS: Record<string, SubmissionStatus> = {
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  REVISION: "REVISION_REQUESTED",
};

// مراجعة العلامة لتسليم UGC: قبول/رفض/طلب تعديل + ملاحظة.
// القبول → مستحقّ محتوى (idempotent) + عمولة المنصّة + خصم الميزانية.
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const b = asRecord(body);
  const action = str(b.action).toUpperCase();
  const note = str(b.note).trim().slice(0, 500) || null;
  const nextStatus = ACTION_STATUS[action];
  if (!nextStatus) {
    return NextResponse.json({ ok: false, error: "إجراء غير صالح." }, { status: 422 });
  }

  const sub = await prisma.contentSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      campaign: {
        select: { id: true, title: true, currency: true, brand: { select: { userId: true, brandName: true } } },
      },
      creatorProfile: { select: { displayName: true, user: { select: { email: true } } } },
    },
  });
  if (!sub) return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  // ملكية: العلامة صاحبة الحملة (أو ADMIN).
  if (session.role !== "ADMIN" && sub.campaign.brand.userId !== session.sub) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }
  // تُراجَع التسليمات المعلّقة فقط (لا مراجعة مزدوجة لحالة نهائيّة).
  if (sub.status !== "SUBMITTED") {
    return NextResponse.json({ ok: false, error: "سبق البتّ في هذا التسليم." }, { status: 409 });
  }

  await prisma.contentSubmission.update({
    where: { id: sub.id },
    data: { status: nextStatus, reviewNote: note, reviewedAt: new Date() },
  });

  // القبول → احتساب مستحقّ المحتوى (idempotent) عبر المحرّك.
  let payoutLabel: string | null = null;
  if (nextStatus === "APPROVED") {
    await accrueUgcContentPayout(sub.id);
    const payout = await prisma.campaignPayout.findFirst({
      where: { submissionId: sub.id, type: "UGC" },
      select: { amount: true, currency: true },
    });
    if (payout) payoutLabel = formatMoney(payout.amount, payout.currency);
  }

  // إشعار المبدع بالنتيجة (بريد) — قبول/رفض/تعديل.
  await sendSubmissionReviewedEmail({
    creatorName: sub.creatorProfile.displayName,
    creatorEmail: sub.creatorProfile.user.email,
    campaignTitle: sub.campaign.title,
    brandName: sub.campaign.brand.brandName,
    statusLabel: SUBMISSION_STATUS_LABEL[nextStatus] ?? nextStatus,
    note,
    payoutLabel,
  }).catch(() => {});

  return NextResponse.json({ ok: true, status: nextStatus, payoutLabel });
}
