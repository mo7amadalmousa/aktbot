import { asRecord, str } from "@/lib/public/block-config";
import { parseEmbed, safeHref } from "@/lib/public/safe-url";
import { BlockShell } from "./block-shell";

// EMBED: تضمين آمن (whitelist مضيفين). غير مدعوم → بديل آمن (رابط) بلا XSS.
export function EmbedBlock({
  config,
  frosted,
}: {
  config: unknown;
  frosted?: boolean;
}) {
  const c = asRecord(config);
  const title = str(c.title);
  const embed = parseEmbed(c.url);

  if (embed) {
    return (
      <BlockShell frosted={frosted} padded={false} className="overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={embed.embedUrl}
            title={title || `تضمين ${embed.provider}`}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {title ? (
          <div className="px-4 py-3 text-sm font-medium">{title}</div>
        ) : null}
      </BlockShell>
    );
  }

  // بديل آمن: رابط خارجيّ إن كان صالحاً، وإلا رسالة لطيفة.
  const href = safeHref(c.url);
  return (
    <BlockShell frosted={frosted}>
      <p className="text-sm font-medium">{title || "محتوى مضمّن"}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="mt-1 block text-sm underline"
          style={{ color: "var(--pp-accent)" }}
        >
          فتح الرابط
        </a>
      ) : (
        <p className="mt-1 text-xs" style={{ opacity: 0.7 }}>
          الرابط غير مدعوم للعرض.
        </p>
      )}
    </BlockShell>
  );
}
