"use client";

import { themeStyleVars, THEME_META } from "@/lib/public/themes";
import { renderBlock } from "@/lib/public/block-registry";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { useLocale, useMessages } from "@/components/i18n/i18n-provider";
import { dirFor } from "@/lib/i18n/config";
import type { BlockType } from "@/generated/prisma/enums";

// معاينة منتج حقيقيّة — تعيد استخدام مكوّنات الصفحة العامّة نفسها (لا mockup مزيّف).
export function PhoneMockup() {
  const locale = useLocale();
  const m = useMessages().landing.hero.mockup;
  const themeId = "sunset" as const;
  const frosted = THEME_META[themeId].frosted;

  const blocks = [
    {
      id: "1",
      type: "LINK" as BlockType,
      config: { label: m.link1, subtitle: m.link1sub, url: "https://example.com" },
    },
    {
      id: "2",
      type: "LINK" as BlockType,
      config: { label: m.link2, url: "https://example.com" },
    },
    {
      id: "3",
      type: "CONSULTATION" as BlockType,
      config: {
        title: m.offerTitle,
        description: m.offerDesc,
        price: 150,
        currency: "USD",
      },
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[290px] overflow-hidden rounded-[2.3rem] border-[7px] border-foreground/85 shadow-2xl">
      <div
        dir={dirFor(locale)}
        className="h-[560px] overflow-y-auto"
        style={{ ...themeStyleVars(themeId), background: "var(--pp-page-bg)" }}
      >
        <div className="px-4 py-7">
          <PublicHeader
            profile={{
              displayName: m.name,
              bio: m.bio,
              avatarUrl: null,
              isVerified: true,
              followerCount: 128500,
              socialLinks: {
                instagram: "https://instagram.com/example",
                tiktok: "https://tiktok.com/@example",
                website: "https://example.com",
              },
            }}
          />
          <div className="mt-6 space-y-3">
            {blocks.map((b) => (
              <div key={b.id}>{renderBlock(b, frosted)}</div>
            ))}
          </div>
          <PublicFooter />
        </div>
      </div>
    </div>
  );
}
