import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import type { BlockType } from "@/generated/prisma/enums";
import { renderBlock } from "@/lib/public/block-registry";
import { PublicHeader } from "@/components/public/public-header";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { safeCssUrl } from "@/lib/public/safe-url";
import { cn } from "@/lib/utils";
import type { LayoutId } from "@/lib/public/page-theme";

// ── أربعة تخطيطات بنيويّة — نفس البلوكات، ترتيب/شكل مختلف. معزولة (--pp-*). ──

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
  frosted: boolean;
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
    p.frosted,
    { interactive: p.interactive, username: p.username },
  );
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

// عرض بلوك واحد بعرض كامل في شبكة Tentacles؟ (البلوكات الغنيّة بعرض كامل)
const HALF_WIDTH = new Set(["LINK", "QR"]);

// ── INK — بسيط: أفاتار وسط + أزرار عموديّة ────────────────────────────
const Ink: LayoutDef = {
  Header: ({ profile }) => <PublicHeader profile={profile} />,
  Blocks: (p) => (
    <div className="mt-8 space-y-4">
      {p.blocks.map((b) => (
        <div key={b.id}>{renderOne(b, p)}</div>
      ))}
    </div>
  ),
};

// ── TENTACLES — شبكة بطاقات (Bento) برأس أفقيّ مدمج ───────────────────
const Tentacles: LayoutDef = {
  Header: ({ profile }) => {
    const avatar = safeCssUrl(profile.avatarUrl);
    return (
      <header className="flex items-center gap-4">
        <span
          className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 text-2xl font-bold"
          style={{
            borderColor: "var(--pp-surface-border)",
            background: "var(--pp-surface)",
            color: "var(--pp-text)",
          }}
        >
          {avatar ? (
            <ResponsiveImage url={avatar} variant="avatar" className="size-full object-cover" sizes="64px" />
          ) : (
            profile.displayName.charAt(0) || "•"
          )}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-lg font-bold" style={{ color: "var(--pp-text)" }}>
              {profile.displayName}
            </h1>
            {profile.isVerified ? (
              <BadgeCheck className="size-4 shrink-0" style={{ color: "var(--pp-accent)" }} />
            ) : null}
          </div>
          {profile.bio ? (
            <p className="line-clamp-2 text-sm" style={{ color: "var(--pp-muted)" }}>
              {profile.bio}
            </p>
          ) : null}
        </div>
      </header>
    );
  },
  Blocks: (p) => (
    <div className="mt-6 grid grid-cols-2 gap-3">
      {p.blocks.map((b) => (
        <div key={b.id} className={cn(!HALF_WIDTH.has(b.type) && "col-span-2")}>
          {renderOne(b, p)}
        </div>
      ))}
    </div>
  ),
};

// ── REEF — مجلّة: بطل كبير + أقسام تحريريّة واسعة ─────────────────────
const Reef: LayoutDef = {
  Header: ({ profile }) => {
    const avatar = safeCssUrl(profile.avatarUrl);
    return (
      <header className="relative flex flex-col items-center pb-4 pt-2 text-center">
        <span
          className="flex size-28 items-center justify-center overflow-hidden rounded-full border-4 text-4xl font-bold shadow-lg"
          style={{
            borderColor: "var(--pp-surface)",
            background: "var(--pp-surface)",
            color: "var(--pp-text)",
          }}
        >
          {avatar ? (
            <ResponsiveImage url={avatar} variant="avatar" className="size-full object-cover" sizes="112px" />
          ) : (
            profile.displayName.charAt(0) || "•"
          )}
        </span>
        <div className="mt-4 flex items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--pp-text)" }}>
            {profile.displayName}
          </h1>
          {profile.isVerified ? (
            <BadgeCheck className="size-6" style={{ color: "var(--pp-accent)" }} />
          ) : null}
        </div>
        {profile.followerCount > 0 ? (
          <p className="mt-1 text-sm font-medium" style={{ color: "var(--pp-muted)" }}>
            {fmtCount(profile.followerCount)} متابع
          </p>
        ) : null}
        {profile.bio ? (
          <p className="mt-3 max-w-md text-base leading-relaxed" style={{ color: "var(--pp-muted)" }}>
            {profile.bio}
          </p>
        ) : null}
      </header>
    );
  },
  Blocks: (p) => (
    <div className="mt-8 space-y-7">
      {p.blocks.map((b) => (
        <div key={b.id}>{renderOne(b, p)}</div>
      ))}
    </div>
  ),
};

// ── CORAL — بطاقات بارزة متراكبة ──────────────────────────────────────
const Coral: LayoutDef = {
  Header: ({ profile }) => <PublicHeader profile={profile} />,
  Blocks: (p) => (
    <div className="mt-8 space-y-5">
      {p.blocks.map((b, i) => (
        <div
          key={b.id}
          style={{
            marginInlineStart: i % 2 === 0 ? 0 : "0.75rem",
            marginInlineEnd: i % 2 === 0 ? "0.75rem" : 0,
          }}
        >
          {renderOne(b, p)}
        </div>
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
