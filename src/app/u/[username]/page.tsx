import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  resolveThemeId,
  themeStyleVars,
  THEME_META,
} from "@/lib/public/themes";
import { resolveBackground } from "@/lib/public/background";
import { asRecord, str, num } from "@/lib/public/block-config";
import { renderBlock } from "@/lib/public/block-registry";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { ResponsiveImage } from "@/components/public/responsive-image";

// caching قويّ — الصفحة العامّة بلا مصادقة/كوكيز.
export const revalidate = 300;

export default async function PublicPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const uname = decodeURIComponent(username).toLowerCase();

  const profile = await prisma.creatorProfile.findUnique({
    where: { username: uname },
    include: {
      page: {
        include: {
          blocks: {
            where: { visibility: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  // غير موجود أو غير منشور → 404 موحّدة (لا كشف).
  if (!profile || !profile.isPublished) notFound();

  const themeId = resolveThemeId(asRecord(profile.page?.theme).id);
  const frosted = THEME_META[themeId].frosted;
  const bg = resolveBackground(profile.page?.background, themeId);
  const dir = profile.direction === "ltr" ? "ltr" : "rtl";
  // فلترة خادميّة: أخفِ ستوري TIME_24H المنتهية (لا تُعرَض ولا تُرسَل روابطها).
  const now = Date.now();
  const blocks = (profile.page?.blocks ?? []).filter((b) => {
    if (b.type !== "STORY") return true;
    const cfg = asRecord(b.config);
    if (str(cfg.mode) !== "VIEW_ONCE") {
      const pub = num(cfg.publishedAt) ?? 0;
      if (pub > 0 && now > pub + 24 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  return (
    <div
      dir={dir}
      lang={profile.language}
      className="relative min-h-dvh w-full"
      style={{ ...themeStyleVars(themeId), ...bg.baseStyle }}
    >
      {bg.imageUrl ? (
        <ResponsiveImage
          url={bg.imageUrl}
          variant="background"
          alt=""
          className="absolute inset-0 size-full object-cover"
          sizes="100vw"
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

      <div className="relative mx-auto w-full max-w-xl px-4 py-10">
        <PublicHeader
          profile={{
            displayName: profile.displayName,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            isVerified: profile.isVerified,
            followerCount: profile.followerCount,
            socialLinks: profile.socialLinks,
          }}
        />

        <div className="mt-8 space-y-4">
          {blocks.length === 0 ? (
            <p
              className="py-10 text-center text-sm"
              style={{ color: "var(--pp-muted)" }}
            >
              لا يوجد محتوى بعد.
            </p>
          ) : (
            blocks.map((block) => (
              <div key={block.id}>
                {renderBlock(block, frosted, {
                  interactive: true,
                  username: profile.username,
                })}
              </div>
            ))
          )}
        </div>

        <PublicFooter />
      </div>
    </div>
  );
}
