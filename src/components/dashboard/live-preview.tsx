"use client";

import { PublicPageBody } from "@/components/public/public-page-body";
import type { EditorBlock, EditorProfile } from "@/lib/creator/editor-types";
import type { PageTheme } from "@/lib/public/page-theme";

// معاينة حيّة — تعيد استخدام جسم الصفحة العامّة نفسه (تخطيط/تبويبات/Sticky/خط).
export function LivePreview({
  profile,
  theme,
  background,
  blocks,
}: {
  profile: EditorProfile;
  theme: PageTheme;
  background: Record<string, unknown>;
  blocks: EditorBlock[];
}) {
  const liteBlocks = blocks
    .filter((b) => b.visibility)
    .map((b) => ({ id: b.id ?? b.key, type: b.type as string, config: b.config }));

  return (
    <div className="h-full w-full overflow-y-auto">
      <PublicPageBody
        profile={{
          displayName: profile.displayName || "اسمك",
          bio: profile.bio || null,
          avatarUrl: profile.avatarUrl || null,
          isVerified: profile.isVerified,
          followerCount: profile.followerCount,
          socialLinks: profile.socialLinks,
          language: profile.language,
          direction: profile.direction,
        }}
        theme={theme}
        background={background}
        blocks={liteBlocks}
        username={profile.username}
        interactive={false}
      />
    </div>
  );
}
