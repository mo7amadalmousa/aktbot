"use client";

import dynamic from "next/dynamic";
import { CmsContextProvider } from "./cms-context";
import type { Overrides } from "@/lib/cms/fields";

// متحكّم الأدمن يُحمَّل ديناميكياً — لا يصل الزائر إطلاقاً (chunk منفصل).
const CmsAdmin = dynamic(() => import("./cms-admin").then((m) => m.CmsAdmin), {
  ssr: false,
});

// المزوّد: للزائر تمرير للقيَم المنشورة فقط (بلا واجهة/كود تحرير)؛ للأدمن يُحمَّل المتحكّم.
export function CmsProvider({
  pageKey,
  locale,
  isAdmin,
  published,
  draft,
  children,
}: {
  pageKey: string;
  locale: string;
  isAdmin: boolean;
  published: Overrides;
  draft: Overrides;
  children: React.ReactNode;
}) {
  if (!isAdmin) {
    return (
      <CmsContextProvider value={{ values: published, admin: null }}>
        {children}
      </CmsContextProvider>
    );
  }
  return (
    <CmsAdmin pageKey={pageKey} locale={locale} published={published} draft={draft}>
      {children}
    </CmsAdmin>
  );
}
