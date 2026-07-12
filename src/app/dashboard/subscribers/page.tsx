import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/subscribers");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) redirect("/dashboard");

  const subs = await prisma.newsletterSubscriber.findMany({
    where: { creatorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <DashboardShell active="subscribers" email={session.email}>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">مشتركو النشرة</h1>
            <p className="text-sm text-muted-foreground">
              {subs.length} مشترك
            </p>
          </div>
          {subs.length > 0 ? (
            <a
              href="/api/creator/subscribers/export"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Download className="size-4" /> تصدير CSV
            </a>
          ) : null}
        </div>

        {subs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            لا مشتركين بعد. أضِف بلوك «نشرة بريدية» في صفحتك.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-start font-medium">البريد الإلكتروني</th>
                  <th className="p-3 text-start font-medium">تاريخ الاشتراك</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3 text-foreground" dir="ltr">
                      {s.email}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {s.createdAt.toISOString().slice(0, 10)}
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
