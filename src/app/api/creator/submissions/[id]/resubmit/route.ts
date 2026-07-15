import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { checkUploadRate } from "@/lib/storage/rate-limit";
import { streamUploadToPrivate, UploadError } from "@/lib/campaign/stream-upload";
import { deletePrivateFile } from "@/lib/storage/private-files";
import { REVIEW_DEADLINE_DAYS } from "@/lib/campaign/ugc";
import { sanitizeCaption } from "@/lib/campaign/ugc-input";

export const runtime = "nodejs";

// إعادة تسليم بعد طلب تعديل (REVISION_REQUESTED → SUBMITTED) — رفع متدفّق جديد.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  if (!checkUploadRate(session.sub)) {
    return NextResponse.json({ ok: false, error: "محاولات كثيرة، انتظر قليلاً." }, { status: 429 });
  }
  const { id } = await params;

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ ok: false, error: "لا ملف مبدع." }, { status: 403 });

  const sub = await prisma.contentSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      creatorProfileId: true,
      assetKey: true,
      caption: true,
      campaign: { select: { status: true, endAt: true } },
    },
  });
  if (!sub || sub.creatorProfileId !== profile.id) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }
  if (sub.status !== "REVISION_REQUESTED") {
    return NextResponse.json({ ok: false, error: "إعادة التسليم متاحة عند طلب تعديل فقط." }, { status: 422 });
  }
  if (sub.campaign.status !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "الحملة غير نشطة." }, { status: 422 });
  }
  if (sub.campaign.endAt && sub.campaign.endAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "انتهت الحملة — لا إعادة تسليم." }, { status: 422 });
  }

  const capRaw = req.nextUrl.searchParams.get("caption");
  const caption = capRaw !== null ? sanitizeCaption(capRaw) : sub.caption;

  let up;
  try {
    up = await streamUploadToPrivate(req.body);
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    throw e;
  }

  const oldKey = sub.assetKey;
  const deadline = new Date(Date.now() + REVIEW_DEADLINE_DAYS * 86400000);
  try {
    await prisma.contentSubmission.update({
      where: { id: sub.id },
      data: {
        assetKey: up.assetKey,
        type: up.type,
        caption,
        status: "SUBMITTED",
        reviewNote: null,
        reviewedAt: null,
        reviewDeadlineAt: deadline, // مهلة مراجعة جديدة للتسليم المُعاد
      },
    });
  } catch (e) {
    await deletePrivateFile(up.assetKey);
    throw e;
  }
  if (oldKey && oldKey !== up.assetKey) await deletePrivateFile(oldKey);

  return NextResponse.json({ ok: true, submissionId: sub.id });
}
