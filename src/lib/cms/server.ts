import { getSession } from "@/lib/auth/session";
import { getPublishedOverrides, getDraftOverrides } from "@/lib/cms/content";
import type { Overrides } from "@/lib/cms/fields";

// يحمّل تجاوزات المحتوى + يكشف الأدمن (للتحرير الموضعيّ) في مكان واحد.
// الأدمن يحصل على published+draft (للتحرير)؛ الزائر على published فقط (سريع/cache).
export async function loadPageCms(
  pageKey: string,
  locale: string,
): Promise<{ isAdmin: boolean; published: Overrides; draft: Overrides }> {
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";
  if (isAdmin) {
    const { published, draft } = await getDraftOverrides(pageKey, locale);
    return { isAdmin: true, published, draft };
  }
  const published = await getPublishedOverrides(pageKey, locale);
  return { isAdmin: false, published, draft: {} };
}
