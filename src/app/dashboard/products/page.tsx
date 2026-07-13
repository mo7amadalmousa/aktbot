import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  ProductManager,
  type DashProduct,
} from "@/components/dashboard/product-manager";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/products");

  // ملكية: منتجات ملف هذا المستخدم فقط (من session.sub).
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) redirect("/dashboard");

  const rows = await prisma.product.findMany({
    where: { creatorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      assets: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { fileName: true, size: true },
      },
      _count: { select: { orders: true } },
    },
  });

  const initial: DashProduct[] = rows.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price,
    currency: p.currency,
    images: p.images,
    isActive: p.isActive,
    file: p.assets[0]
      ? { fileName: p.assets[0].fileName, size: p.assets[0].size }
      : null,
    orderCount: p._count.orders,
  }));

  return (
    <DashboardShell active="products" email={session.email}>
      <div className="flex flex-1 flex-col p-5">
        <ProductManager initial={initial} />
      </div>
    </DashboardShell>
  );
}
