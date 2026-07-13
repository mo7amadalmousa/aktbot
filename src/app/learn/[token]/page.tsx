import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { parseEmbed } from "@/lib/public/safe-url";
import { arr, str } from "@/lib/public/block-config";
import { CoursePlayer } from "@/components/learn/course-player";

export const dynamic = "force-dynamic";

// صفحة مشغّل الكورس — محميّة بتوكن Enrollment (المشتري فقط). لا مصادقة حساب،
// الوصول برابط غير قابل للتخمين. الملفّات/الفيديو تُبَثّ عبر مسار محميّ منفصل.
export default async function LearnPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 32) notFound();

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      order: { select: { status: true } },
      product: {
        select: {
          title: true,
          creatorProfile: { select: { displayName: true } },
          modules: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              lessons: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  type: true,
                  contentRef: true,
                  assetKey: true,
                  assetName: true,
                  duration: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!enrollment || enrollment.order.status !== "PAID") notFound();

  const completed = arr(enrollment.completedLessons)
    .map((v) => str(v))
    .filter(Boolean);

  // لا نكشف assetKey للعميل — نمرّر hasAsset فقط + رابط البثّ المحميّ.
  const modules = enrollment.product.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type as "VIDEO" | "TEXT" | "FILE",
      duration: l.duration,
      text: l.type === "TEXT" ? l.contentRef : null,
      embedUrl:
        l.type === "VIDEO" && l.contentRef
          ? (parseEmbed(l.contentRef)?.embedUrl ?? null)
          : null,
      hasAsset: Boolean(l.assetKey),
      assetName: l.assetName,
    })),
  }));

  return (
    <CoursePlayer
      token={token}
      courseTitle={enrollment.product.title}
      creatorName={enrollment.product.creatorProfile.displayName}
      modules={modules}
      completed={completed}
    />
  );
}
