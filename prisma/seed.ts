import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// بذرة عرض idempotent — محصورة ببيانات الديمو (قابلة للحذف لاحقاً).
// تشغيل: npm run db:seed

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type BlockSeed = { type: string; config: unknown; order: number };

async function seedCreator(input: {
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  isVerified: boolean;
  followerCount: number;
  socialLinks: Record<string, string>;
  theme: unknown;
  background: unknown;
  blocks: BlockSeed[];
}) {
  const passwordHash = await bcrypt.hash("Demo!2026", 12);

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { emailVerified: true },
    create: { email: input.email, passwordHash, role: "CREATOR", emailVerified: true },
    select: { id: true },
  });

  const profile = await prisma.creatorProfile.upsert({
    where: { username: input.username },
    update: {
      displayName: input.displayName,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      isVerified: input.isVerified,
      followerCount: input.followerCount,
      socialLinks: input.socialLinks,
      isPublished: true,
      language: "ar",
      direction: "rtl",
    },
    create: {
      userId: user.id,
      username: input.username,
      displayName: input.displayName,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      isVerified: input.isVerified,
      followerCount: input.followerCount,
      socialLinks: input.socialLinks,
      isPublished: true,
    },
    select: { id: true },
  });

  const page = await prisma.page.upsert({
    where: { creatorProfileId: profile.id },
    update: { theme: input.theme as object, background: input.background as object },
    create: {
      creatorProfileId: profile.id,
      theme: input.theme as object,
      background: input.background as object,
    },
    select: { id: true },
  });

  // إعادة بناء بلوكات الديمو لهذه الصفحة فقط (idempotent).
  await prisma.block.deleteMany({ where: { pageId: page.id } });
  await prisma.block.createMany({
    data: input.blocks.map((b) => ({
      pageId: page.id,
      type: b.type as never,
      config: b.config as object,
      order: b.order,
      visibility: true,
    })),
  });

  return { username: input.username, blocks: input.blocks.length };
}

async function main() {
  const lina = await seedCreator({
    email: "lina@demo.aktbot.local",
    username: "lina.beauty",
    displayName: "لينا • خبيرة جمال",
    bio: "أخصّائية عناية بالبشرة · نصائح وروتين يوميّ · احجزي استشارتك أونلاين 🌿",
    avatarUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=240&q=80",
    isVerified: true,
    followerCount: 128500,
    socialLinks: {
      instagram: "https://instagram.com/lina.beauty",
      tiktok: "https://www.tiktok.com/@lina.beauty",
      youtube: "https://youtube.com/@lina.beauty",
      website: "https://lina.example.com",
    },
    theme: { layout: "CORAL", fontFamily: "tajawal" },
    background: {},
    blocks: [
      {
        type: "LINK",
        order: 0,
        config: {
          label: "احجزي استشارتك",
          url: "https://lina.example.com/book",
          subtitle: "ردّ خلال ٢٤ ساعة",
        },
      },
      {
        type: "EMBED",
        order: 1,
        config: {
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          title: "روتيني الصباحي للعناية بالبشرة",
        },
      },
      {
        type: "GALLERY",
        order: 2,
        config: {
          title: "قبل / بعد",
          images: [
            { url: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80" },
            { url: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&q=80" },
            { url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80" },
            { url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80" },
          ],
        },
      },
      {
        type: "CONSULTATION",
        order: 3,
        config: {
          title: "استشارة بشرة خاصّة",
          description: "جلسة أونلاين لتحليل بشرتك ووضع روتين مخصّص",
          price: 150,
          currency: "USD",
          duration: "٣٠ دقيقة",
        },
      },
      {
        type: "PAID_VIDEO",
        order: 4,
        config: {
          title: "كورس العناية الكامل",
          description: "ساعتان فيديو + ملفات",
          price: 45,
          currency: "USD",
        },
      },
      {
        type: "FORM",
        order: 5,
        config: {
          title: "تواصلي معي",
          submitLabel: "إرسال",
          fields: [
            { label: "الاسم", type: "text", placeholder: "اسمك" },
            { label: "البريد الإلكتروني", type: "email", placeholder: "you@example.com" },
            { label: "رسالتك", type: "textarea", placeholder: "كيف أساعدك؟" },
          ],
        },
      },
      {
        type: "BEFORE_AFTER",
        order: 6,
        config: {
          beforeUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80",
          afterUrl: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&q=80",
          beforeLabel: "قبل",
          afterLabel: "بعد",
          orientation: "horizontal",
        },
      },
      {
        type: "STORY",
        order: 7,
        config: {
          title: "روتين اليوم",
          mode: "TIME_24H",
          publishedAt: Date.now(),
          media: [
            { url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80" },
            { url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80" },
          ],
        },
      },
      {
        type: "SOCIAL",
        order: 8,
        config: {
          links: [
            { platform: "instagram", url: "https://instagram.com/lina.beauty" },
            { platform: "tiktok", url: "https://www.tiktok.com/@lina.beauty" },
            { platform: "youtube", url: "https://youtube.com/@lina.beauty" },
            { platform: "whatsapp", url: "https://wa.me/905000000000" },
          ],
        },
      },
      {
        type: "DISCOUNT",
        order: 9,
        config: {
          title: "خصوماتي",
          showCount: true,
          coupons: [
            {
              id: "noon10",
              brandName: "Noon",
              description: "خصم 10% بكودي الخاص",
              code: "ALFAN131",
              url: "https://www.noon.com",
            },
            {
              id: "trendyol40",
              brandName: "Trendyol",
              description: "خصم 40% بكودي",
              code: "MFAT",
              url: "https://www.trendyol.com",
            },
          ],
        },
      },
    ],
  });

  const sara = await seedCreator({
    email: "sara@demo.aktbot.local",
    username: "sara.glow",
    displayName: "سارة جلو",
    bio: "ميك أب آرتست · منتجات مختارة · ورشات أونلاين ✨",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&q=80",
    isVerified: false,
    followerCount: 8900,
    socialLinks: {
      instagram: "https://instagram.com/sara.glow",
      website: "https://sara.example.com",
    },
    theme: { layout: "TENTACLES", fontFamily: "tajawal" },
    background: {},
    blocks: [
      {
        type: "LINK",
        order: 0,
        config: { label: "متجري", url: "https://sara.example.com/shop" },
      },
      {
        type: "GALLERY",
        order: 1,
        config: {
          title: "أعمالي",
          images: [
            { url: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&q=80" },
            { url: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80" },
          ],
        },
      },
      {
        type: "STORE",
        order: 2,
        config: {
          title: "منتجاتي المختارة",
          products: [
            {
              title: "أحمر شفاه مطفّي",
              price: 24,
              currency: "USD",
              url: "https://example.com/shop/lipstick",
              imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&q=80",
            },
            {
              title: "كريم أساس",
              price: 32,
              currency: "USD",
              url: "https://example.com/shop/foundation",
              imageUrl: "https://images.unsplash.com/photo-1631730359585-38a4935cbec4?w=400&q=80",
            },
          ],
        },
      },
      {
        type: "NEWSLETTER",
        order: 3,
        config: {
          title: "نشرتي الأسبوعية",
          description: "نصائح ميك أب كل أسبوع في بريدك.",
          buttonLabel: "اشتراك",
        },
      },
      { type: "QR", order: 4, config: { title: "شارك صفحتي" } },
    ],
  });

  console.log("✓ seeded:", lina, sara);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
