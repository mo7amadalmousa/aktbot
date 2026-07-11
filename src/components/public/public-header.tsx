import {
  BadgeCheck,
  Camera,
  Video,
  Music2,
  AtSign,
  Share2,
  Globe,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { asRecord } from "@/lib/public/block-config";
import { safeHref, safeCssUrl } from "@/lib/public/safe-url";

// lucide v1 أزال أيقونات العلامات التجارية → أيقونات عامّة معبّرة.
const SOCIAL_ICONS: Record<string, LucideIcon> = {
  instagram: Camera,
  youtube: Video,
  tiktok: Music2,
  x: AtSign,
  twitter: AtSign,
  facebook: Share2,
  website: Globe,
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export interface HeaderProfile {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  followerCount: number;
  socialLinks: unknown;
}

export function PublicHeader({ profile }: { profile: HeaderProfile }) {
  const avatar = safeCssUrl(profile.avatarUrl);
  const initial = profile.displayName.trim().charAt(0) || "•";

  const social = asRecord(profile.socialLinks);
  const socialEntries = Object.entries(social)
    .map(([key, val]) => {
      const href = safeHref(val);
      if (!href) return null;
      const Icon = SOCIAL_ICONS[key.toLowerCase()] ?? Link2;
      return { key, href, Icon };
    })
    .filter((x): x is { key: string; href: string; Icon: LucideIcon } => x !== null);

  return (
    <header className="flex flex-col items-center text-center">
      <div
        className="flex size-24 items-center justify-center overflow-hidden rounded-full border-2 text-3xl font-bold"
        style={{
          borderColor: "var(--pp-surface-border)",
          background: "var(--pp-surface)",
          color: "var(--pp-text)",
          boxShadow: "var(--pp-shadow)",
        }}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={profile.displayName}
            className="size-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        <h1 className="text-xl font-bold" style={{ color: "var(--pp-text)" }}>
          {profile.displayName}
        </h1>
        {profile.isVerified ? (
          <BadgeCheck
            className="size-5"
            style={{ color: "var(--pp-accent)" }}
            aria-label="موثّق"
          />
        ) : null}
      </div>

      {profile.followerCount > 0 ? (
        <p className="mt-1 text-sm" style={{ color: "var(--pp-muted)" }}>
          {formatCount(profile.followerCount)} متابع
        </p>
      ) : null}

      {profile.bio ? (
        <p
          className="mt-3 max-w-md text-sm leading-relaxed"
          style={{ color: "var(--pp-muted)" }}
        >
          {profile.bio}
        </p>
      ) : null}

      {socialEntries.length > 0 ? (
        <div className="mt-4 flex items-center gap-3">
          {socialEntries.map(({ key, href, Icon }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              aria-label={key}
              className="transition-transform hover:-translate-y-0.5"
              style={{ color: "var(--pp-text)" }}
            >
              <Icon className="size-5" />
            </a>
          ))}
        </div>
      ) : null}
    </header>
  );
}
