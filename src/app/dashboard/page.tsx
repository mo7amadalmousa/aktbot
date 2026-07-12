import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { resolvePageTheme } from "@/lib/public/page-theme";
import { asRecord } from "@/lib/public/block-config";
import { CreatorEditor } from "@/components/dashboard/creator-editor";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { EditorInitial } from "@/lib/creator/editor-types";

export const dynamic = "force-dynamic";

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
    theme: resolvePageTheme(profile.page?.theme),
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
    <DashboardShell active="page" email={session.email}>
      <CreatorEditor initial={initial} />
    </DashboardShell>
  );
}
