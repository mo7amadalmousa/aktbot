import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import type { BlockType } from "@/generated/prisma/enums";
import { renderBlock } from "@/lib/public/block-registry";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { SocialIcon } from "@/components/public/blocks/social-icons";
import { safeCssUrl, safeHref } from "@/lib/public/safe-url";
import { asRecord, str } from "@/lib/public/block-config";
import { cn } from "@/lib/utils";
import type { LayoutId } from "@/lib/public/page-theme";

// ── أربعة تخطيطات مطابقة aktbot-templates-preview-v2 — تعيد استخدام block-registry ──

export interface LiteBlock {
  id: string;
  type: string;
  config: unknown;
}
export interface HeaderProps {
  profile: {
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    followerCount: number;
    socialLinks: unknown;
  };
}
export interface BlocksProps {
  blocks: LiteBlock[];
  username?: string;
  interactive?: boolean;
}
interface LayoutDef {
  Header: (p: HeaderProps) => ReactNode;
  Blocks: (p: BlocksProps) => ReactNode;
}

function renderOne(b: LiteBlock, p: BlocksProps): ReactNode {
  return renderBlock(
    { id: b.id, type: b.type as BlockType, config: b.config },
    false,
    { interactive: p.interactive, username: p.username },
  );
}
function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

// أيقونات التواصل في الرأس (من profile.socialLinks).
function Socials({ links, onDark }: { links: unknown; onDark: boolean }) {
  const r = asRecord(links);
  const items = Object.entries(r)
    .map(([platform, v]) => {
      const href = safeHref(v);
      return href ? { platform, href } : null;
    })
    .filter((x): x is { platform: string; href: string } => x !== null);
  if (items.length === 0) return null;
  return (
    <div className="flex justify-center gap-3">
      {items.map((s) => (
        <a
          key={s.platform}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="flex size-9 items-center justify-center rounded-full"
          style={{
            background: onDark ? "rgba(255,255,255,0.18)" : "#F0F1F1",
            color: onDark ? "#fff" : "var(--pp-accent)",
          }}
        >
          <SocialIcon platform={s.platform} className="size-4" />
        </a>
      ))}
    </div>
  );
}

function Avatar({
  url,
  name,
  className,
  sizes,
}: {
  url: string | null;
  name: string;
  className: string;
  sizes: string;
}) {
  const safe = safeCssUrl(url);
  return (
    <span className={cn("flex items-center justify-center overflow-hidden rounded-full", className)}>
      {safe ? (
        <ResponsiveImage url={safe} variant="avatar" className="size-full object-cover" sizes={sizes} />
      ) : (
        <span className="text-3xl font-bold">{name.charAt(0) || "•"}</span>
      )}
    </span>
  );
}

// رأس مركزيّ (Ink فاتح · Coral داكن) — أفاتار/اسم/توثيق/متابعين/نبذة/تواصل.
function CenterHeader({ profile, onDark }: HeaderProps & { onDark: boolean }) {
  const textColor = onDark ? "#fff" : "var(--pp-text)";
  const mutedColor = onDark ? "rgba(255,255,255,0.85)" : "var(--pp-muted)";
  return (
    <header className="flex flex-col items-center text-center">
      <Avatar
        url={profile.avatarUrl}
        name={profile.displayName}
        className={cn("size-24", onDark ? "border-4 border-white/30" : "border-2 border-black/10")}
        sizes="96px"
      />
      <div className="mt-3 flex items-center gap-1.5">
        <h1 className="text-2xl font-black" style={{ color: textColor }}>
          {profile.displayName}
        </h1>
        {profile.isVerified ? (
          <BadgeCheck className="size-5" style={{ color: onDark ? "#fff" : "var(--pp-accent)" }} />
        ) : null}
      </div>
      {profile.bio ? (
        <p className="mt-2 max-w-xs text-sm" style={{ color: mutedColor }}>
          {profile.bio}
        </p>
      ) : null}
      {profile.followerCount > 0 ? (
        <p className="mt-2 text-sm font-bold" style={{ color: mutedColor }}>
          {fmtCount(profile.followerCount)} متابع
        </p>
      ) : null}
      <div className="mt-3">
        <Socials links={profile.socialLinks} onDark={onDark} />
      </div>
    </header>
  );
}

const HALF_WIDTH = new Set(["LINK", "QR"]);

// ── INK ───────────────────────────────────────────────────────────────
const Ink: LayoutDef = {
  Header: ({ profile }) => <CenterHeader profile={profile} onDark={false} />,
  Blocks: (p) => (
    <div className="mt-7 space-y-3">
      {p.blocks.map((b) => (
        <div key={b.id}>{renderOne(b, p)}</div>
      ))}
    </div>
  ),
};

// ── TENTACLES (bento داكن · رأس أفقيّ) ────────────────────────────────
const Tentacles: LayoutDef = {
  Header: ({ profile }) => (
    <header className="flex items-center gap-3">
      <Avatar url={profile.avatarUrl} name={profile.displayName} className="size-16 shrink-0 border-2 border-white/15 rounded-2xl" sizes="64px" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-lg font-black" style={{ color: "#fff" }}>
            {profile.displayName}
          </h1>
          {profile.isVerified ? <BadgeCheck className="size-4 shrink-0" style={{ color: "var(--pp-accent)" }} /> : null}
        </div>
        {profile.bio ? (
          <p className="line-clamp-1 text-xs" style={{ color: "var(--pp-muted)" }}>
            {profile.bio}
          </p>
        ) : null}
      </div>
    </header>
  ),
  Blocks: (p) => (
    <div className="mt-5 grid grid-cols-2 gap-2.5">
      {p.blocks.map((b) => (
        <div key={b.id} className={cn(!HALF_WIDTH.has(b.type) && "col-span-2")}>
          {renderOne(b, p)}
        </div>
      ))}
    </div>
  ),
};

// ── REEF (مجلّة · بطل + عدّادات) ──────────────────────────────────────
const Reef: LayoutDef = {
  Header: ({ profile }) => {
    const hero = safeCssUrl(profile.avatarUrl);
    return (
      <header className="-mx-4 -mt-10 mb-4">
        <div className="relative flex h-52 items-end overflow-hidden p-4">
          {hero ? (
            <ResponsiveImage url={hero} variant="background" alt="" className="absolute inset-0 size-full object-cover" sizes="100vw" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#f6d5e0,#7b8fd4)" }} />
          )}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent 70%)" }}
          />
          <div className="relative z-10 text-white">
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-black">{profile.displayName}</h1>
              {profile.isVerified ? <BadgeCheck className="size-5" /> : null}
            </div>
            {profile.bio ? <p className="text-sm opacity-90">{profile.bio}</p> : null}
          </div>
        </div>
        {profile.followerCount > 0 ? (
          <div className="mx-4 border-b py-3 text-center" style={{ borderColor: "var(--pp-surface-border)" }}>
            <span className="block text-base font-black" style={{ color: "var(--pp-text)" }}>
              {fmtCount(profile.followerCount)}
            </span>
            <span className="text-xs font-semibold" style={{ color: "var(--pp-muted)" }}>
              متابع
            </span>
          </div>
        ) : null}
        <div className="mt-3 flex justify-center">
          <Socials links={profile.socialLinks} onDark={false} />
        </div>
      </header>
    );
  },
  Blocks: (p) => (
    <div className="space-y-3">
      {p.blocks.map((b) => (
        <div key={b.id}>{renderOne(b, p)}</div>
      ))}
    </div>
  ),
};

// ── CORAL (بطاقات على تدرّج Teal) ─────────────────────────────────────
const Coral: LayoutDef = {
  Header: ({ profile }) => <CenterHeader profile={profile} onDark={true} />,
  Blocks: (p) => (
    <div className="mt-6 space-y-3">
      {p.blocks.map((b) => (
        <div key={b.id}>{renderOne(b, p)}</div>
      ))}
    </div>
  ),
};

export const LAYOUT_COMPONENTS: Record<LayoutId, LayoutDef> = {
  INK: Ink,
  TENTACLES: Tentacles,
  REEF: Reef,
  CORAL: Coral,
};
