import { redirect } from "next/navigation";
import { LayoutGrid, Megaphone, Wallet, BarChart3 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { resolveThemeId } from "@/lib/public/themes";
import { asRecord } from "@/lib/public/block-config";
import { CreatorEditor } from "@/components/dashboard/creator-editor";
import type { EditorInitial } from "@/lib/creator/editor-types";

export const dynamic = "force-dynamic";

const NAV_SOON = [
  { label: "الحملات", Icon: Megaphone },
  { label: "الأرباح", Icon: Wallet },
  { label: "التحليلات", Icon: BarChart3 },
];

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    include: { page: { include: { blocks: { orderBy: { order: "asc" } } } } },
  });

  if (!profile) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          لا يوجد ملف مبدع لحسابك. تواصل مع الدعم.
        </p>
      </main>
    );
  }

  const initial: EditorInitial = {
    profile: {
      displayName: profile.displayName,
      bio: profile.bio ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      username: profile.username,
      isPublished: profile.isPublished,
      isVerified: profile.isVerified,
      followerCount: profile.followerCount,
      socialLinks: asRecord(profile.socialLinks) as Record<string, string>,
      language: profile.language,
      direction: profile.direction,
    },
    themeId: resolveThemeId(asRecord(profile.page?.theme).id),
    background: asRecord(profile.page?.background),
    blocks: (profile.page?.blocks ?? []).map((b) => ({
      key: b.id,
      id: b.id,
      type: b.type,
      config: asRecord(b.config),
      visibility: b.visibility,
    })),
  };

  return (
    <div className="flex min-h-dvh w-full">
      {/* شريط جانبي (هوية المنصّة) */}
      <aside className="hidden w-56 shrink-0 flex-col border-l border-border bg-card lg:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            A
          </span>
          <span className="font-bold text-foreground">AktBot</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          <span className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            <LayoutGrid className="size-4" /> صفحتي
          </span>
          {NAV_SOON.map(({ label, Icon }) => (
            <span
              key={label}
              className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground/60"
            >
              <Icon className="size-4" /> {label}
              <span className="ms-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                قريباً
              </span>
            </span>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <p className="mb-2 truncate px-2 text-xs text-muted-foreground">
            {session.email}
          </p>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      {/* شريط علويّ للجوال */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 lg:hidden">
          <span className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              A
            </span>
            <span className="font-bold text-foreground">AktBot</span>
          </span>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              خروج
            </button>
          </form>
        </div>

        <CreatorEditor initial={initial} />
      </div>
    </div>
  );
}
