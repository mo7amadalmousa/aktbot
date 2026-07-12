import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { asRecord, str, arr } from "@/lib/public/block-config";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/coupons");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: {
      id: true,
      page: {
        select: {
          blocks: { where: { type: "DISCOUNT" }, select: { id: true, config: true } },
        },
      },
    },
  });
  if (!profile) redirect("/dashboard");

  const discountBlocks = profile.page?.blocks ?? [];
  const blockIds = discountBlocks.map((b) => b.id);
  const counters = blockIds.length
    ? await prisma.couponCounter.findMany({
        where: { blockId: { in: blockIds } },
        select: { blockId: true, couponId: true, count: true },
      })
    : [];
  const countMap = new Map<string, number>();
  for (const cc of counters) countMap.set(`${cc.blockId}:${cc.couponId}`, cc.count);

  const rows = discountBlocks
    .flatMap((b) =>
      arr(asRecord(b.config).coupons).map((cp) => {
        const r = asRecord(cp);
        return {
          brand: str(r.brandName) || "—",
          code: str(r.code) || "—",
          count: countMap.get(`${b.id}:${str(r.id)}`) ?? 0,
        };
      }),
    )
    .sort((a, b) => b.count - a.count);

  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <DashboardShell active="coupons" email={session.email}>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">إحصاءات الخصومات</h1>
            <p className="text-sm text-muted-foreground">
              إجمالي النسخ: <strong className="text-primary">{total.toLocaleString("en-US")}</strong>
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            لا كوبونات بعد. أضِف بلوك «خصومات» في صفحتك.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-start font-medium">العلامة</th>
                  <th className="p-3 text-start font-medium">الكود</th>
                  <th className="p-3 text-start font-medium">مرات النسخ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-3 font-medium text-foreground">{r.brand}</td>
                    <td className="p-3 text-muted-foreground" dir="ltr">{r.code}</td>
                    <td className="p-3 font-bold text-primary">
                      {r.count.toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
