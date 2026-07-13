import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  StatCard,
  MiniBars,
  SourceBar,
  fmtNum,
} from "@/components/dashboard/analytics-bits";
import { getCreatorAnalytics } from "@/lib/analytics/query";
import { Eye, Users, MousePointerClick, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/analytics");

  // ملكية: تحليلات ملف هذا المستخدم فقط (session.sub).
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true, username: true },
  });
  if (!profile) redirect("/dashboard");

  const a = await getCreatorAnalytics(profile.id);
  const maxClick = Math.max(1, ...a.topBlocks.map((b) => b.count));

  return (
    <DashboardShell active="analytics" email={session.email}>
      <div className="flex flex-1 flex-col p-5">
        <h1 className="mb-4 text-lg font-bold text-foreground">التحليلات</h1>

        {/* عدّاد الزوّار بارز في الأعلى */}
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="زوّار اليوم"
            value={fmtNum(a.today)}
            sub={`${fmtNum(a.todayUniques)} فريد`}
            icon={<Eye className="size-4" />}
            accent
          />
          <StatCard
            label="آخر 7 أيام"
            value={fmtNum(a.last7)}
            sub={`${fmtNum(a.last7Uniques)} فريد`}
            icon={<Eye className="size-4" />}
          />
          <StatCard
            label="آخر 30 يوماً"
            value={fmtNum(a.last30)}
            sub={`${fmtNum(a.last30Uniques)} فريد`}
            icon={<Users className="size-4" />}
          />
          <StatCard
            label="المتابعون"
            value={fmtNum(a.followerCount)}
            icon={<UserPlus className="size-4" />}
          />
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MiniBars series={a.series} />
          </div>
          <SourceBar sources={a.sources} />
        </div>

        {/* أكثر البلوكات نقراً */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <MousePointerClick className="size-4 text-primary" /> أكثر البلوكات نقراً
          </p>
          {a.topBlocks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              لا نقرات بعد. شارك صفحتك ليبدأ التتبّع.
            </p>
          ) : (
            <div className="space-y-2">
              {a.topBlocks.map((b) => (
                <div key={b.blockId} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm text-foreground">
                    {b.label}
                    <span className="ms-1 text-[10px] text-muted-foreground">{b.type}</span>
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(b.count / maxClick) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-end text-sm font-medium text-foreground">
                    {fmtNum(b.count)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          التتبّع مجمّع ومجهول (لا بيانات شخصيّة). صفحتك:{" "}
          <a href={`/u/${profile.username}`} className="text-primary hover:underline">
            /u/{profile.username}
          </a>
        </p>
      </div>
    </DashboardShell>
  );
}
