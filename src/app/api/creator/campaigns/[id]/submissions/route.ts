import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { checkUploadRate } from "@/lib/storage/rate-limit";
import { streamUploadToPrivate, UploadError } from "@/lib/campaign/stream-upload";
import { deletePrivateFile } from "@/lib/storage/private-files";
import { REVIEW_DEADLINE_DAYS } from "@/lib/campaign/ugc";
import { sanitizeCaption } from "@/lib/campaign/ugc-input";

export const runtime = "nodejs";

// تسليم المبدع لمحتوى (فيديو/صورة) لمكوّن المحتوى → رفع متدفّق لتخزين خاصّ.
// حرّاس: مشاركة ACTIVE · مكوّن المحتوى مُفعّل · الحملة نشطة غير منتهية · magic bytes.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  if (!checkUploadRate(session.sub)) {
    return NextResponse.json({ ok: false, error: "محاولات كثيرة، انتظر قليلاً." }, { status: 429 });
  }
  const { id: campaignId } = await params;

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ ok: false, error: "لا ملف مبدع." }, { status: 403 });

  const participation = await prisma.campaignParticipation.findUnique({
    where: { campaignId_creatorProfileId: { campaignId, creatorProfileId: profile.id } },
    select: {
      id: true,
      status: true,
      campaign: { select: { contentEnabled: true, status: true, endAt: true } },
    },
  });
  if (!participation) {
    return NextResponse.json({ ok: false, error: "لست ضمن هذه الحملة." }, { status: 403 });
  }
  if (participation.status !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "اقبل الدعوة أوّلاً لتسليم المحتوى." }, { status: 403 });
  }
  const c = participation.campaign;
  if (!c.contentEnabled) {
    return NextResponse.json({ ok: false, error: "هذه الحملة لا تطلب محتوى." }, { status: 422 });
  }
  if (c.status !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "الحملة غير نشطة." }, { status: 422 });
  }
  if (c.endAt && c.endAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "انتهت الحملة — لا تسليم جديد." }, { status: 422 });
  }

  const caption = sanitizeCaption(req.nextUrl.searchParams.get("caption"));

  let up;
  try {
    up = await streamUploadToPrivate(req.body);
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    throw e;
  }

  const deadline = new Date(Date.now() + REVIEW_DEADLINE_DAYS * 86400000);
  try {
    const sub = await prisma.contentSubmission.create({
      data: {
        participationId: participation.id,
        campaignId,
        creatorProfileId: profile.id,
        type: up.type,
        assetKey: up.assetKey,
        caption,
        status: "SUBMITTED",
        reviewDeadlineAt: deadline,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, submissionId: sub.id });
  } catch (e) {
    await deletePrivateFile(up.assetKey); // تنظيف الملف عند فشل الحفظ (لا يتيمة)
    throw e;
  }
}
