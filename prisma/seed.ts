import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writePrivateFile } from "../src/lib/storage/private-files";

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

  return {
    username: input.username,
    blocks: input.blocks.length,
    profileId: profile.id,
    pageId: page.id,
  };
}

// منتج رقميّ حقيقيّ للينا + بلوك متجر داخليّ يعرضه (شراء عبر المنصّة).
// idempotent: يُعاد إنشاء المنتج بنفس العنوان + ملف خاصّ بمفتاح ثابت.
async function seedLinaDigitalProduct(profileId: string, pageId: string) {
  const FILE_KEY = "seed-lina-skincare-guide.pdf";
  const bytes = Buffer.from(
    "%PDF-1.4\nAktBot demo — دليل العناية بالبشرة الكامل\n(هذا ملف تجريبيّ للتحميل الآمن)\n",
    "utf8",
  );
  await writePrivateFile(FILE_KEY, bytes);

  const title = "دليل العناية بالبشرة الكامل (PDF)";
  await prisma.product.deleteMany({
    where: { creatorProfileId: profileId, title },
  });
  const product = await prisma.product.create({
    data: {
      creatorProfileId: profileId,
      type: "DIGITAL",
      title,
      description:
        "دليل PDF شامل: روتين صباحيّ ومسائيّ + قائمة مكوّنات موصى بها + جدول أسبوعيّ.",
      price: 1999, // ‏$19.99 بأصغر وحدة
      currency: "USD",
      images: [
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80",
      ],
      isActive: true,
      assets: {
        create: {
          fileKey: FILE_KEY,
          fileName: "skincare-guide.pdf",
          size: bytes.byteLength,
        },
      },
    },
    select: { id: true },
  });

  // ── كورس (idempotent بالعنوان) — وحدتان + دروس (نصّ/فيديو تضمين) ──────
  const courseTitle = "كورس العناية بالبشرة خطوة بخطوة";
  await prisma.product.deleteMany({
    where: { creatorProfileId: profileId, title: courseTitle },
  });
  const course = await prisma.product.create({
    data: {
      creatorProfileId: profileId,
      type: "COURSE",
      title: courseTitle,
      description: "كورس فيديو + قراءات: أساسيّات العناية، بناء روتين، ومكوّنات فعّالة.",
      price: 4900, // ‏$49.00
      currency: "USD",
      images: [
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
      ],
      isActive: true,
      modules: {
        create: [
          {
            title: "الأساسيّات",
            order: 0,
            lessons: {
              create: [
                {
                  title: "مقدّمة الكورس",
                  order: 0,
                  type: "VIDEO",
                  contentRef: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                  duration: "4:12",
                },
                {
                  title: "أنواع البشرة",
                  order: 1,
                  type: "TEXT",
                  contentRef:
                    "لكلّ بشرة احتياجات مختلفة. في هذا الدرس نتعرّف على الأنواع الأربعة وكيفيّة تحديد نوعك…",
                  duration: "قراءة 5 د",
                },
              ],
            },
          },
          {
            title: "بناء الروتين",
            order: 1,
            lessons: {
              create: [
                {
                  title: "الروتين الصباحيّ",
                  order: 0,
                  type: "TEXT",
                  contentRef: "التنظيف ← التونر ← السيروم ← المرطّب ← الواقي الشمسيّ.",
                  duration: "قراءة 6 د",
                },
              ],
            },
          },
        ],
      },
    },
    select: { id: true },
  });

  // ── منتج فيزيائيّ (idempotent بالعنوان) — مخزون + رسوم شحن ───────────
  const physTitle = "رولر جادي للوجه (Jade Roller)";
  await prisma.product.deleteMany({
    where: { creatorProfileId: profileId, title: physTitle },
  });
  const physical = await prisma.product.create({
    data: {
      creatorProfileId: profileId,
      type: "PHYSICAL",
      title: physTitle,
      description: "أداة تدليك الوجه لتحسين الدورة الدمويّة ونضارة البشرة.",
      price: 3500, // ‏$35.00
      currency: "USD",
      stock: 25,
      shippingFee: 500, // ‏$5.00
      images: [
        "https://images.unsplash.com/photo-1631730359585-38a4935cbec4?w=600&q=80",
      ],
      isActive: true,
    },
    select: { id: true },
  });

  // منتج رقميّ بعملة JOD (3 منازل عشريّة ×1000) — لاختبار المعامل غير الـ×100.
  const jodTitle = "بطاقة ألوان الموسم (JOD)";
  await prisma.product.deleteMany({
    where: { creatorProfileId: profileId, title: jodTitle },
  });
  const jodProduct = await prisma.product.create({
    data: {
      creatorProfileId: profileId,
      type: "DIGITAL",
      title: jodTitle,
      description: "بطاقة ألوان رقميّة — مُسعّرة بالدينار الأردنيّ (٣ منازل).",
      price: 19999, // ‏19.999 JOD (×1000، لا ×100)
      currency: "JOD",
      images: [
        "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80",
      ],
      isActive: true,
      assets: {
        create: {
          fileKey: "seed-lina-skincare-guide.pdf",
          fileName: "color-card.pdf",
          size: 128,
        },
      },
    },
    select: { id: true },
  });

  // بلوك متجر داخليّ يعرض الأنواع بأزرار شراء فعّالة (يشمل JOD).
  await prisma.block.create({
    data: {
      pageId,
      type: "STORE",
      order: 10,
      visibility: true,
      config: {
        title: "متجري",
        productIds: [product.id, course.id, physical.id, jodProduct.id],
        products: [],
      },
    },
  });

  return {
    digital: product.id,
    course: course.id,
    physical: physical.id,
    jod: jodProduct.id,
  };
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
          mode: "PAID",
          price: 150,
          currency: "USD",
          duration: "٣٠ دقيقة",
          meetingType: "online",
          meetingLink: "https://meet.google.com/abc-defg-hij",
          instructions: "أرسلي صورة واضحة لبشرتك قبل الجلسة إن أمكن.",
        },
      },
      {
        type: "CONSULTATION",
        order: 11,
        config: {
          title: "مكالمة تعارف مجانيّة",
          description: "١٥ دقيقة نتعرّف فيها على احتياج بشرتك — مجاناً",
          mode: "FREE",
          meetingType: "online",
          instructions: "جهّزي أسئلتك.",
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

  const linaProduct = await seedLinaDigitalProduct(lina.profileId, lina.pageId);

  // ── مستخدم إشراف (ADMIN) — لا ملف مبدع، دور منصّة ─────────────────────
  const adminHash = await bcrypt.hash("Demo!2026", 12);
  await prisma.user.upsert({
    where: { email: "admin@demo.aktbot.local" },
    update: { role: "ADMIN", emailVerified: true },
    create: {
      email: "admin@demo.aktbot.local",
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  // ── بيانات تحليلات تجريبيّة (عدّادات مجمّعة) — آخر 14 يوماً ────────────
  const seedAnalytics = async (profileId: string, base: number) => {
    for (let i = 0; i < 14; i++) {
      const date = new Date(Date.now() - i * 86400000)
        .toISOString()
        .slice(0, 10);
      const views = base + (13 - i) * 2 + (i % 3);
      const uniques = Math.round(views * 0.6);
      const srcDirect = Math.round(views * 0.5);
      const srcSocial = Math.round(views * 0.35);
      const srcOther = views - srcDirect - srcSocial;
      await prisma.pageViewDaily.upsert({
        where: { creatorProfileId_date: { creatorProfileId: profileId, date } },
        update: { views, uniques, srcDirect, srcSocial, srcOther },
        create: {
          creatorProfileId: profileId,
          date,
          views,
          uniques,
          srcDirect,
          srcSocial,
          srcOther,
        },
      });
    }
  };
  await seedAnalytics(lina.profileId, 22);
  await seedAnalytics(sara.profileId, 9);

  // نقرات بلوكات لينا (أعلى بلوكين).
  const linaBlocks = await prisma.block.findMany({
    where: { page: { creatorProfileId: lina.profileId } },
    orderBy: { order: "asc" },
    take: 3,
    select: { id: true },
  });
  const clickCounts = [140, 76, 41];
  for (let i = 0; i < linaBlocks.length; i++) {
    await prisma.blockClick.upsert({
      where: { blockId: linaBlocks[i].id },
      update: { count: clickCounts[i] },
      create: {
        blockId: linaBlocks[i].id,
        creatorProfileId: lina.profileId,
        count: clickCounts[i],
      },
    });
  }

  // توفّر لينا للحجز: أحد–خميس 10:00–17:00 (إسطنبول)، جلسة 30د، أفق 21 يوماً.
  const linaWeekly = [0, 1, 2, 3, 4].map((day) => ({
    day,
    ranges: [{ start: "10:00", end: "17:00" }],
  }));
  await prisma.availability.upsert({
    where: { creatorProfileId: lina.profileId },
    update: {
      timezone: "Europe/Istanbul",
      slotMinutes: 30,
      bufferMinutes: 0,
      horizonDays: 21,
      weekly: linaWeekly,
      exceptions: [],
    },
    create: {
      creatorProfileId: lina.profileId,
      timezone: "Europe/Istanbul",
      slotMinutes: 30,
      bufferMinutes: 0,
      horizonDays: 21,
      weekly: linaWeekly,
      exceptions: [],
    },
  });

  // ── طبقة العمولة: قاعدة شاملة 10% + استثناء الفيزيائيّ 5% ────────────
  await prisma.commissionRule.deleteMany({ where: { label: { startsWith: "seed:" } } });
  const globalRule = await prisma.commissionRule.create({
    data: {
      scope: "GLOBAL",
      percentBps: 1000, // 10%
      priority: 0,
      isActive: true,
      label: "seed:الافتراضيّة الشاملة",
    },
    select: { id: true },
  });
  const physRule = await prisma.commissionRule.create({
    data: {
      scope: "BY_TYPE",
      saleType: "STORE_PHYSICAL",
      percentBps: 500, // 5%
      priority: 0,
      isActive: true,
      label: "seed:عمولة المنتجات الفيزيائيّة",
    },
    select: { id: true },
  });

  // مبيعات تجريبيّة مؤكّدة + سجلّ عمولة للينا (لعرض «أرباحي» والسجلّ الكلّي).
  await prisma.order.deleteMany({
    where: { buyerEmail: "demo-sales@aktbot.local" },
  }); // cascade يحذف صفوف Ledger المرتبطة
  const demoSales = [
    { saleType: "CONSULTATION" as const, amount: 15000, blockType: "CONSULTATION" as const, productId: null as string | null, ruleId: globalRule.id, bps: 1000 },
    { saleType: "STORE_DIGITAL" as const, amount: 1999, blockType: null as "CONSULTATION" | null, productId: linaProduct.digital, ruleId: globalRule.id, bps: 1000 },
    { saleType: "STORE_PHYSICAL" as const, amount: 4000, blockType: null as "CONSULTATION" | null, productId: linaProduct.physical, ruleId: physRule.id, bps: 500 },
  ];
  for (const s of demoSales) {
    const comm = Math.round((s.amount * s.bps) / 10000);
    const order = await prisma.order.create({
      data: {
        creatorProfileId: lina.profileId,
        buyerName: "عميل تجريبيّ",
        buyerEmail: "demo-sales@aktbot.local",
        amount: s.amount,
        currency: "USD",
        status: "PAID",
        provider: "mock",
        blockType: s.blockType,
        productId: s.productId,
        metadata: { title: "مبيعة تجريبيّة" },
      },
      select: { id: true },
    });
    await prisma.commissionLedger.create({
      data: {
        orderId: order.id,
        creatorProfileId: lina.profileId,
        saleType: s.saleType,
        grossAmount: s.amount,
        commissionAmount: comm,
        netCreatorAmount: s.amount - comm,
        appliedRuleId: s.ruleId,
        currency: "USD",
        status: "ACCRUED",
      },
    });
  }

  // ── حساب علامة (BRAND) + حملة نشطة + مشاركة لينا (إسناد) ─────────────
  const brandUser = await prisma.user.upsert({
    where: { email: "brand@demo.aktbot.local" },
    update: { role: "BRAND", emailVerified: true },
    create: {
      email: "brand@demo.aktbot.local",
      passwordHash: adminHash,
      role: "BRAND",
      emailVerified: true,
    },
    select: { id: true },
  });
  const brandProfile = await prisma.brandProfile.upsert({
    where: { userId: brandUser.id },
    update: { brandName: "Glow Cosmetics", isVerified: true },
    create: {
      userId: brandUser.id,
      brandName: "Glow Cosmetics",
      website: "https://glow.example.com",
      contactEmail: "hello@glow.example.com",
      description: "علامة عناية بالبشرة — حملات مع مبدعات مختارات.",
      isVerified: true,
    },
    select: { id: true },
  });
  await prisma.campaign.deleteMany({ where: { brandId: brandProfile.id } }); // cascade
  // حملة SALE كاملة (ميزانية + نسبة المبدع 20% + شروط) — لينا نشطة.
  const campaign = await prisma.campaign.create({
    data: {
      brandId: brandProfile.id,
      title: "حملة إطلاق الصيف",
      type: "SALE",
      status: "ACTIVE",
      description: "روّجي منتجاتنا واكسبي 20% من كل بيعة عبر رابطك.",
      brief: "أنشئي محتوى يعرض المنتج مع كودك الخاصّ.",
      coverImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80",
      currency: "USD",
      budgetAmount: 50000, // ‏$500
      targetUrl: "https://glow.example.com/summer",
      requirements: { items: ["ذكر العلامة", "استخدام الكود في الوصف"] },
      payoutConfig: { creatorBps: 2000 }, // 20% للمبدع
      spentAmount: 800, // مصروف تجريبيّ (يطابق مستحقّ لينا)
    },
    select: { id: true },
  });
  await prisma.campaignParticipation.create({
    data: {
      campaignId: campaign.id,
      creatorProfileId: lina.profileId,
      uniqueCode: "LINAGLOW",
      uniqueLink: "/r/LINAGLOW",
      status: "ACTIVE",
      joinedAt: new Date(),
      clicks: 12,
      conversions: 2,
      sales: 2,
      salesValue: 3998,
      payoutAccrued: 800,
    },
  });
  // دعوة سارة (INVITED) — لاختبار القبول.
  await prisma.campaignParticipation.create({
    data: {
      campaignId: campaign.id,
      creatorProfileId: sara.profileId,
      uniqueCode: "SARAGLOW",
      uniqueLink: "/r/SARAGLOW",
      status: "INVITED",
    },
  });

  // حملة UGC كاملة (C6): تسليم → مراجعة → مستحقّ + حقوق استخدام بأجر منفصل.
  const ugcCampaign = await prisma.campaign.create({
    data: {
      brandId: brandProfile.id,
      title: "تحدّي المحتوى الخريفيّ (UGC)",
      type: "UGC",
      status: "ACTIVE",
      description: "أنشئي فيديو/صورة UGC واكسبي مبلغاً لكل محتوى مقبول.",
      brief: "أنشئي محتوى يعرض روتين الخريف مع منتجاتنا.",
      currency: "USD",
      budgetAmount: 100000, // ‏$1000 (ميزانية المحتوى)
      payoutConfig: { fixedPerContent: 5000 }, // ‏$50 لكل محتوى مقبول
      requirements: { items: ["إضاءة جيّدة", "ذكر العلامة"] },
      usageRightsWanted: true,
      usageRightsBudget: 20000, // ‏$200 (ميزانية الحقوق المنفصلة)
    },
    select: { id: true },
  });
  // لينا مشاركة نشطة في حملة UGC (تستطيع التسليم).
  const ugcPart = await prisma.campaignParticipation.create({
    data: {
      campaignId: ugcCampaign.id,
      creatorProfileId: lina.profileId,
      uniqueCode: "LINAUGC",
      uniqueLink: "/r/LINAUGC",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    select: { id: true },
  });
  // تسليم تجريبيّ (صورة PNG صغيرة في التخزين الخاصّ) — SUBMITTED للمراجعة.
  const UGC_KEY = "seed-ugc-lina.png";
  await writePrivateFile(
    UGC_KEY,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  await prisma.contentSubmission.create({
    data: {
      participationId: ugcPart.id,
      campaignId: ugcCampaign.id,
      creatorProfileId: lina.profileId,
      type: "IMAGE",
      assetKey: UGC_KEY,
      caption: "منشور تجريبيّ لتحدّي الخريف",
      status: "SUBMITTED",
    },
  });

  // إعداد المنصّة: الحدّ الأدنى لأجر حقوق الاستخدام per-currency (يضمن العمولة).
  await prisma.platformSetting.upsert({
    where: { key: "usage_rights_min_fee" },
    update: { value: { USD: 500, SAR: 2000 } },
    create: { key: "usage_rights_min_fee", value: { USD: 500, SAR: 2000 } },
  });

  console.log("✓ seeded:", lina, sara, linaProduct);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
