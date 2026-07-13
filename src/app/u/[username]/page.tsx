import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { resolvePageTheme } from "@/lib/public/page-theme";
import { PublicPageBody } from "@/components/public/public-page-body";
import { AnalyticsTracker } from "@/components/public/analytics-tracker";

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

  // منتجات المتجر الداخليّة — تُحلّ خادميّاً (سعر القاعدة) وتُحقن في config.
  // أمان: منتجات هذا المبدع فقط · فعّالة · رقميّة · لها ملف (قابلة للتسليم).
  const storeIds = new Set<string>();
  for (const b of allBlocks) {
    if (b.type !== "STORE") continue;
    for (const pid of arr(asRecord(b.config).productIds)) {
      const s = str(pid);
      if (s) storeIds.add(s);
    }
  }
  const storeRows = storeIds.size
    ? await prisma.product.findMany({
        where: {
          id: { in: [...storeIds] },
          creatorProfileId: profile.id,
          isActive: true,
        },
        select: {
          id: true,
          type: true,
          title: true,
          price: true,
          shippingFee: true,
          stock: true,
          currency: true,
          images: true,
          _count: { select: { assets: true } },
          modules: { select: { _count: { select: { lessons: true } } } },
        },
      })
    : [];
  // أظهر فقط القابل للشراء فعلاً حسب النوع (له ملف/درس/مخزون).
  const storeProducts = storeRows.filter((p) => {
    if (p.type === "DIGITAL") return p._count.assets > 0;
    if (p.type === "COURSE") return p.modules.some((m) => m._count.lessons > 0);
    if (p.type === "PHYSICAL") return p.stock === null || p.stock > 0;
    return false;
  });
  const productMap = new Map(storeProducts.map((p) => [p.id, p]));

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
      if (b.type === "STORE") {
        const cfg = asRecord(b.config);
        const resolvedProducts = arr(cfg.productIds)
          .map((pid) => productMap.get(str(pid)))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .map((p) => ({
            id: p.id,
            type: p.type,
            title: p.title,
            price: p.price, // minor units — سعر القاعدة (بلا الشحن)
            currency: p.currency,
            image: str((arr(p.images).map((u) => str(u)))[0]),
          }));
        return { id: b.id, type: b.type, config: { ...cfg, resolvedProducts } };
      }
      return { id: b.id, type: b.type, config: b.config };
    });

  return (
    <>
      <AnalyticsTracker username={profile.username} />
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
    </>
  );
}
