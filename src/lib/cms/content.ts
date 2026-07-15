import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import type { Overrides } from "@/lib/cms/fields";

// ── قراءة تجاوزات المحتوى (خادميّ) ────────────────────────────────────

function asObj(v: unknown): Overrides {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Overrides) : {};
}

// المنشور لصفحة/لغة — مع fallback للّغة الافتراضيّة للحقول المفقودة (لا صفحة فارغة).
export async function getPublishedOverrides(
  pageKey: string,
  locale: string,
): Promise<Overrides> {
  const rows = await prisma.pageContent.findMany({
    where: { pageKey, locale: { in: [locale, DEFAULT_LOCALE] } },
    select: { locale: true, published: true },
  });
  const base = rows.find((r) => r.locale === DEFAULT_LOCALE)?.published;
  const loc = rows.find((r) => r.locale === locale)?.published;
  // اللغة المطلوبة تفوق، والافتراضيّة قاعدة (fallback للحقول غير المترجَمة).
  return { ...asObj(base), ...asObj(loc) };
}

// للأدمن (المحرّر): المنشور كقاعدة + المسوّدة تعلوه.
export async function getDraftOverrides(
  pageKey: string,
  locale: string,
): Promise<{ published: Overrides; draft: Overrides }> {
  const row = await prisma.pageContent.findUnique({
    where: { pageKey_locale: { pageKey, locale } },
    select: { draft: true, published: true },
  });
  return { published: asObj(row?.published), draft: asObj(row?.draft) };
}

// حفظ المسوّدة (استبدال كامل لخريطة التجاوزات).
export async function saveDraft(
  pageKey: string,
  locale: string,
  overrides: Overrides,
  updatedBy: string,
): Promise<void> {
  await prisma.pageContent.upsert({
    where: { pageKey_locale: { pageKey, locale } },
    update: { draft: overrides as object, updatedBy },
    create: { pageKey, locale, draft: overrides as object, updatedBy },
  });
}

// نشر: المسوّدة الحاليّة تصبح المنشور (الزائر يراها).
export async function publishDraft(
  pageKey: string,
  locale: string,
  overrides: Overrides,
  updatedBy: string,
): Promise<void> {
  await prisma.pageContent.upsert({
    where: { pageKey_locale: { pageKey, locale } },
    update: { draft: overrides as object, published: overrides as object, updatedBy },
    create: { pageKey, locale, draft: overrides as object, published: overrides as object, updatedBy },
  });
}

// تجاهل المسوّدة (العودة للمنشور).
export async function discardDraft(pageKey: string, locale: string): Promise<void> {
  // مسح المسوّدة فعليّاً (DbNull، لا undefined الذي يتجاهله Prisma).
  await prisma.pageContent
    .update({ where: { pageKey_locale: { pageKey, locale } }, data: { draft: Prisma.DbNull } })
    .catch(() => {});
}
