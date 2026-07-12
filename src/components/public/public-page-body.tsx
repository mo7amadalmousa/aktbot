import { cn } from "@/lib/utils";
import { asRecord, str } from "@/lib/public/block-config";
import { resolveBackground } from "@/lib/public/background";
import { pageStyleVars, isFrosted, type PageTheme } from "@/lib/public/page-theme";
import { fontClassName } from "@/lib/public/fonts";
import { resolveStickyCta } from "@/lib/public/sticky";
import { LAYOUT_COMPONENTS, type LiteBlock } from "@/components/public/layouts";
import { PublicTabs } from "@/components/public/public-tabs";
import { StickyCta } from "@/components/public/sticky-cta";
import { PublicFooter } from "@/components/public/public-footer";
import { ResponsiveImage } from "@/components/public/responsive-image";

export interface BodyProfile {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  followerCount: number;
  socialLinks: unknown;
  language: string;
  direction: string;
}

// جسم الصفحة العامّة المشترك — تخطيط + تبويبات + Sticky CTA + خط + خلفية.
// يُعاد استخدامه في /u/[username] (خادم) والمعاينة الحيّة (عميل).
export function PublicPageBody({
  profile,
  theme,
  background,
  blocks,
  username,
  interactive = false,
}: {
  profile: BodyProfile;
  theme: PageTheme;
  background: unknown;
  blocks: LiteBlock[];
  username?: string;
  interactive?: boolean;
}) {
  const layout = LAYOUT_COMPONENTS[theme.layout];
  const frosted = isFrosted(theme);
  const bg = resolveBackground(background, theme.id);
  const dir = profile.direction === "ltr" ? "ltr" : "rtl";
  const sticky = resolveStickyCta(theme.stickyCta, blocks);

  const blockArea = (bs: LiteBlock[]) => (
    <layout.Blocks
      blocks={bs}
      frosted={frosted}
      username={username}
      interactive={interactive}
    />
  );

  // تجميع البلوكات في تبويبات (إن وُجدت > 1). بلا tabId أو tab محذوف → أوّل تبويب.
  let content;
  if (theme.tabs.length > 1) {
    const ids = new Set(theme.tabs.map((t) => t.id));
    const first = theme.tabs[0].id;
    const tabOf = (b: LiteBlock) => {
      const t = str(asRecord(b.config).tabId);
      return t && ids.has(t) ? t : first;
    };
    const grouped = theme.tabs.map((t) => ({
      id: t.id,
      label: t.label,
      content: blockArea(blocks.filter((b) => tabOf(b) === t.id)),
    }));
    content = <PublicTabs tabs={grouped} />;
  } else {
    content = blockArea(blocks);
  }

  return (
    <div
      dir={dir}
      lang={profile.language}
      className={cn(
        "relative min-h-dvh w-full",
        fontClassName(theme.fontFamily),
        sticky && "pb-24",
      )}
      style={{ ...pageStyleVars(theme), ...bg.baseStyle }}
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
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.5))" }}
        />
      ) : null}

      <div className="relative mx-auto w-full max-w-xl px-4 py-10">
        <layout.Header profile={profile} />
        {content}
        <PublicFooter />
      </div>

      {sticky ? <StickyCta label={sticky.label} href={sticky.href} /> : null}
    </div>
  );
}
