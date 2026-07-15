import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { asRecord, str } from "@/lib/public/block-config";
import { accrueContentPayout } from "@/lib/campaign/ugc";
import { sendSubmissionReviewedEmail } from "@/lib/email";
import { formatMoney } from "@/lib/payments/money";
import { SUBMISSION_STATUS_LABEL } from "@/lib/campaign/labels";

export const runtime = "nodejs";

// مراجعة العلامة لتسليم محتوى: قبول · طلب تعديل (مرّة واحدة، ملاحظة إلزاميّة) ·
// رفض (سبب إلزاميّ). القبول → مستحقّ محتوى (idempotent) + عمولة + خصم ميزانية المحتوى.
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
  if (!["APPROVE", "REJECT", "REVISION"].includes(action)) {
    return NextResponse.json({ ok: false, error: "إجراء غير صالح." }, { status: 422 });
  }
  // ملاحظة إلزاميّة للتعديل، سبب إلزاميّ للرفض (شفافية · لا رفض بلا سبب).
  if ((action === "REVISION" || action === "REJECT") && !note) {
    return NextResponse.json(
      { ok: false, error: action === "REVISION" ? "ملاحظة التعديل إلزاميّة." : "سبب الرفض إلزاميّ." },
      { status: 422 },
    );
  }

  const sub = await prisma.contentSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      revisionCount: true,
      campaign: {
        select: { id: true, title: true, brand: { select: { userId: true, brandName: true } } },
      },
      creatorProfile: { select: { displayName: true, user: { select: { email: true } } } },
    },
  });
  if (!sub) return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  if (session.role !== "ADMIN" && sub.campaign.brand.userId !== session.sub) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }
  if (sub.status !== "SUBMITTED") {
    return NextResponse.json({ ok: false, error: "سبق البتّ في هذا التسليم." }, { status: 409 });
  }
  // تعديل واحد فقط ثم قرار نهائيّ (قبول/رفض).
  if (action === "REVISION" && sub.revisionCount >= 1) {
    return NextResponse.json(
      { ok: false, error: "استُنفد طلب التعديل — القرار الآن قبول أو رفض." },
      { status: 409 },
    );
  }

  const nextStatus =
    action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "REVISION_REQUESTED";

  await prisma.contentSubmission.update({
    where: { id: sub.id },
    data: {
      status: nextStatus,
      reviewNote: note,
      reviewedAt: new Date(),
      ...(action === "REVISION" ? { revisionCount: { increment: 1 } } : {}),
    },
  });

  let payoutLabel: string | null = null;
  if (action === "APPROVE") {
    await accrueContentPayout(sub.id);
    const payout = await prisma.campaignPayout.findFirst({
      where: { submissionId: sub.id, type: "CONTENT" },
      select: { amount: true, currency: true },
    });
    if (payout) payoutLabel = formatMoney(payout.amount, payout.currency);
  }

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
