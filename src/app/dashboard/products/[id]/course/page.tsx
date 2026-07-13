import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CourseBuilder } from "@/components/dashboard/course-builder";

export const dynamic = "force-dynamic";

export default async function CourseContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=/dashboard/products/${id}/course`);

  // ملكية: الكورس يخصّ ملف هذا المستخدم فقط.
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
  if (!product || product.creatorProfile.userId !== session.sub) notFound();
  if (product.type !== "COURSE") redirect("/dashboard/products");

  const initial = product.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type as "VIDEO" | "TEXT" | "FILE",
      contentRef: l.contentRef ?? "",
      assetKey: l.assetKey ?? "",
      assetName: l.assetName ?? "",
      duration: l.duration ?? "",
    })),
  }));

  return (
    <DashboardShell active="products" email={session.email}>
      <div className="flex flex-1 flex-col p-5">
        <CourseBuilder productId={id} courseTitle={product.title} initial={initial} />
      </div>
    </DashboardShell>
  );
}
