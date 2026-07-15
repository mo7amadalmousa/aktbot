import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { checkUploadRate } from "@/lib/storage/rate-limit";
import { readUgcUpload, UploadError } from "@/lib/campaign/upload";
import { deletePrivateFile } from "@/lib/storage/private-files";

export const runtime = "nodejs";

// تسليم المبدع لمحتوى حملة UGC → تخزين خاصّ + ContentSubmission (SUBMITTED).
// حرّاس: مشاركة نشطة (قَبِل الدعوة) · حملة UGC نشطة غير منتهية · أمان الرفع.
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

  // ملكية + أهليّة: المبدع مشارك نشط في هذه الحملة (قَبِل الدعوة).
  const participation = await prisma.campaignParticipation.findUnique({
    where: { campaignId_creatorProfileId: { campaignId, creatorProfileId: profile.id } },
    select: {
      id: true,
      status: true,
      campaign: { select: { type: true, status: true, endAt: true } },
    },
  });
  if (!participation) {
    return NextResponse.json({ ok: false, error: "لست ضمن هذه الحملة." }, { status: 403 });
  }
  if (participation.status !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "اقبل الدعوة أوّلاً لتسليم المحتوى." }, { status: 403 });
  }
  const c = participation.campaign;
  if (c.type !== "UGC") {
    return NextResponse.json({ ok: false, error: "التسليم متاح لحملات المحتوى (UGC) فقط." }, { status: 422 });
  }
  if (c.status !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "الحملة غير نشطة." }, { status: 422 });
  }
  if (c.endAt && c.endAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "انتهت الحملة — لا تسليم جديد." }, { status: 422 });
  }

  let uploaded;
  try {
    uploaded = await readUgcUpload(await req.formData());
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    throw e;
  }

  try {
    const sub = await prisma.contentSubmission.create({
      data: {
        participationId: participation.id,
        campaignId,
        creatorProfileId: profile.id,
        type: uploaded.type,
        assetKey: uploaded.assetKey,
        caption: uploaded.caption,
        status: "SUBMITTED",
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, submissionId: sub.id });
  } catch (e) {
    // فشل الحفظ بعد كتابة الملف → نظّف الملف الخاصّ (لا يتيمة).
    await deletePrivateFile(uploaded.assetKey);
    throw e;
  }
}
