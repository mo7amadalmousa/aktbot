import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeCourseInput } from "@/lib/creator/products";
import { deletePrivateFile } from "@/lib/storage/private-files";

export const runtime = "nodejs";

// يحمّل كورساً مملوكاً للمستخدم في الجلسة (type=COURSE) مع بنيته الكاملة.
async function loadOwnedCourse(id: string, userId: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      creatorProfile: { select: { userId: true } },
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!product || product.creatorProfile.userId !== userId) return null;
  return product;
}

// GET — بنية الكورس (وحدات ← دروس) لإدارة المبدع.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const { id } = await params;
  const product = await loadOwnedCourse(id, session.sub);
  if (!product) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    title: product.title,
    modules: product.modules.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        type: l.type,
        contentRef: l.contentRef,
        assetKey: l.assetKey,
        assetName: l.assetName,
        duration: l.duration,
      })),
    })),
  });
}

// PUT — استبدال بنية الكورس مع الحفاظ على المعرّفات الموجودة (تقدّم المشترين)
// وتنظيف ملفات الدروس المحذوفة من التخزين الخاصّ.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const { id } = await params;
  const product = await loadOwnedCourse(id, session.sub);
  if (!product) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const clean = sanitizeCourseInput(body);

  // المعرّفات المملوكة فعلاً (لمنع اختطاف صفوف مستأجر آخر عبر id مزيّف).
  const ownedModuleIds = new Set(product.modules.map((m) => m.id));
  const ownedLessonIds = new Set(
    product.modules.flatMap((m) => m.lessons.map((l) => l.id)),
  );
  const existingLessons = product.modules.flatMap((m) => m.lessons);

  // المعرّفات الباقية بعد الحفظ.
  const keepModuleIds = new Set(
    clean.filter((m) => m.id && ownedModuleIds.has(m.id)).map((m) => m.id!),
  );
  const keepLessonIds = new Set(
    clean
      .flatMap((m) => m.lessons)
      .filter((l) => l.id && ownedLessonIds.has(l.id))
      .map((l) => l.id!),
  );

  // ملفات الدروس المحذوفة → تنظيف من التخزين بعد نجاح المعاملة.
  const removedAssetKeys = existingLessons
    .filter((l) => l.assetKey && !keepLessonIds.has(l.id))
    .map((l) => l.assetKey as string);

  await prisma.$transaction(async (tx) => {
    // حذف الوحدات المُزالة (cascade يحذف دروسها).
    await tx.courseModule.deleteMany({
      where: {
        productId: product.id,
        id: { notIn: keepModuleIds.size ? [...keepModuleIds] : ["__none__"] },
      },
    });
    // حذف الدروس المُزالة من الوحدات الباقية.
    await tx.courseLesson.deleteMany({
      where: {
        module: { productId: product.id },
        id: { notIn: keepLessonIds.size ? [...keepLessonIds] : ["__none__"] },
      },
    });

    for (let mi = 0; mi < clean.length; mi++) {
      const m = clean[mi];
      const moduleId =
        m.id && ownedModuleIds.has(m.id)
          ? (
              await tx.courseModule.update({
                where: { id: m.id },
                data: { title: m.title, order: mi },
                select: { id: true },
              })
            ).id
          : (
              await tx.courseModule.create({
                data: { productId: product.id, title: m.title, order: mi },
                select: { id: true },
              })
            ).id;

      for (let li = 0; li < m.lessons.length; li++) {
        const l = m.lessons[li];
        const data = {
          title: l.title,
          order: li,
          type: l.type,
          contentRef: l.contentRef,
          assetKey: l.assetKey,
          assetName: l.assetName,
          duration: l.duration,
        };
        if (l.id && ownedLessonIds.has(l.id)) {
          await tx.courseLesson.update({
            where: { id: l.id },
            data: { ...data, moduleId },
          });
        } else {
          await tx.courseLesson.create({ data: { ...data, moduleId } });
        }
      }
    }
  });

  for (const key of removedAssetKeys) await deletePrivateFile(key);

  return NextResponse.json({ ok: true });
}
