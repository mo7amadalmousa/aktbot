"use client";

import { themeStyleVars, THEME_META, resolveThemeId } from "@/lib/public/themes";
import { resolveBackground } from "@/lib/public/background";
import { renderBlock } from "@/lib/public/block-registry";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { ResponsiveImage } from "@/components/public/responsive-image";
import type { EditorBlock, EditorProfile } from "@/lib/creator/editor-types";
import type { BlockType } from "@/generated/prisma/enums";

// معاينة حيّة — تعيد استخدام مكوّنات العرض العامّة نفسها (لا تكرار منطق).
export function LivePreview({
  profile,
  themeId,
  background,
  blocks,
}: {
  profile: EditorProfile;
  themeId: string;
  background: Record<string, unknown>;
  blocks: EditorBlock[];
}) {
  const id = resolveThemeId(themeId);
  const frosted = THEME_META[id].frosted;
  const bg = resolveBackground(background, id);
  const dir = profile.direction === "ltr" ? "ltr" : "rtl";
  const visible = blocks.filter((b) => b.visibility);

  return (
    <div
      dir={dir}
      lang={profile.language}
      className="relative h-full w-full overflow-y-auto"
      style={{ ...themeStyleVars(id), ...bg.baseStyle }}
    >
      {bg.imageUrl ? (
        <ResponsiveImage
          url={bg.imageUrl}
          variant="background"
          alt=""
          className="absolute inset-0 size-full object-cover"
          sizes="(max-width: 1024px) 100vw, 400px"
        />
      ) : null}
      {frosted && bg.imageUrl ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.5))",
          }}
        />
      ) : null}

      <div className="relative mx-auto w-full max-w-md px-4 py-8">
        <PublicHeader
          profile={{
            displayName: profile.displayName || "اسمك",
            bio: profile.bio || null,
            avatarUrl: profile.avatarUrl || null,
            isVerified: profile.isVerified,
            followerCount: profile.followerCount,
            socialLinks: profile.socialLinks,
          }}
        />
        <div className="mt-6 space-y-3">
          {visible.length === 0 ? (
            <p
              className="py-8 text-center text-sm"
              style={{ color: "var(--pp-muted)" }}
            >
              أضِف بلوكاً ليظهر هنا.
            </p>
          ) : (
            visible.map((b) => (
              <div key={b.key}>
                {renderBlock(
                  { id: b.key, type: b.type as BlockType, config: b.config },
                  frosted,
                )}
              </div>
            ))
          )}
        </div>
        <PublicFooter />
      </div>
    </div>
  );
}
