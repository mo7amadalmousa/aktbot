import { asRecord, str, arr } from "@/lib/public/block-config";
import { safeHref } from "@/lib/public/safe-url";
import { platformLabel } from "@/lib/public/social-platforms";
import { SocialIcon } from "./social-icons";

// SOCIAL: صفّ أيقونات روابط التواصل — يتكيّف مع قالب الصفحة (--pp-*).
export function SocialBlock({ config }: { config: unknown }) {
  const c = asRecord(config);
  const links = arr(c.links)
    .map((l) => {
      const r = asRecord(l);
      const href = safeHref(r.url);
      const platform = str(r.platform) || "website";
      return href ? { platform, href } : null;
    })
    .filter((x): x is { platform: string; href: string } => x !== null)
    .slice(0, 20);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-1">
      {links.map((l, i) => (
        <a
          key={i}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          aria-label={platformLabel(l.platform)}
          title={platformLabel(l.platform)}
          className="flex size-11 items-center justify-center rounded-full border transition-transform hover:-translate-y-0.5"
          style={{
            background: "var(--pp-surface)",
            borderColor: "var(--pp-surface-border)",
            color: "var(--pp-text)",
            boxShadow: "var(--pp-shadow)",
          }}
        >
          <SocialIcon platform={l.platform} className="size-5" />
        </a>
      ))}
    </div>
  );
}
