import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { asRecord, arr, str } from "@/lib/public/block-config";

export const runtime = "nodejs";

// تبديل حالة «درس مكتمل» — تقدّم أساسيّ محميّ بتوكن Enrollment.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 32) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      order: { select: { status: true } },
      product: { select: { modules: { select: { lessons: { select: { id: true } } } } } },
    },
  });
  if (!enrollment || enrollment.order.status !== "PAID") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const lessonId = str(asRecord(body).lessonId);
  // الدرس يجب أن يخصّ هذا الكورس (لا كتابة معرّفات خارجيّة).
  const validIds = new Set(
    enrollment.product.modules.flatMap((m) => m.lessons.map((l) => l.id)),
  );
  if (!lessonId || !validIds.has(lessonId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const current = arr(enrollment.completedLessons)
    .map((v) => str(v))
    .filter(Boolean);
  const set = new Set(current);
  if (set.has(lessonId)) set.delete(lessonId);
  else set.add(lessonId);

  await prisma.courseEnrollment.update({
    where: { id: enrollment.id },
    data: { completedLessons: [...set] as object },
  });

  return NextResponse.json({ ok: true, completed: [...set] });
}
