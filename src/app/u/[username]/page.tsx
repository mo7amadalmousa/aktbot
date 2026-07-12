import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { resolvePageTheme } from "@/lib/public/page-theme";
import { PublicPageBody } from "@/components/public/public-page-body";

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
          blocks: { where: { visibility: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!profile || !profile.isPublished) notFound();

  const theme = resolvePageTheme(profile.page?.theme);

  const allBlocks = profile.page?.blocks ?? [];

  // عدّادات نسخ الكوبونات (مجمّعة) — تُحقن في config (cache-safe، تقريبيّة).
  const discountIds = allBlocks.filter((b) => b.type === "DISCOUNT").map((b) => b.id);
  const counters = discountIds.length
    ? await prisma.couponCounter.findMany({
        where: { blockId: { in: discountIds } },
        select: { blockId: true, couponId: true, count: true },
      })
    : [];
  const countMap = new Map<string, Map<string, number>>();
  for (const cc of counters) {
    if (!countMap.has(cc.blockId)) countMap.set(cc.blockId, new Map());
    countMap.get(cc.blockId)!.set(cc.couponId, cc.count);
  }

  // فلترة خادميّة: أخفِ ستوري TIME_24H المنتهية.
  const now = Date.now();
  const blocks = allBlocks
    .filter((b) => {
      if (b.type !== "STORY") return true;
      const cfg = asRecord(b.config);
      if (str(cfg.mode) !== "VIEW_ONCE") {
        const pub = num(cfg.publishedAt) ?? 0;
        if (pub > 0 && now > pub + 24 * 60 * 60 * 1000) return false;
      }
      return true;
    })
    .map((b) => {
      if (b.type === "DISCOUNT") {
        const cfg = asRecord(b.config);
        const cm = countMap.get(b.id);
        const coupons = arr(cfg.coupons).map((cp) => {
          const r = asRecord(cp);
          return { ...r, copyCount: cm?.get(str(r.id)) ?? 0 };
        });
        return { id: b.id, type: b.type, config: { ...cfg, coupons } };
      }
      return { id: b.id, type: b.type, config: b.config };
    });

  return (
    <PublicPageBody
      profile={{
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        isVerified: profile.isVerified,
        followerCount: profile.followerCount,
        socialLinks: profile.socialLinks,
        language: profile.language,
        direction: profile.direction,
      }}
      theme={theme}
      background={profile.page?.background}
      blocks={blocks}
      username={profile.username}
      interactive
    />
  );
}
