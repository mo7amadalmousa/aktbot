import { asRecord, str } from "@/lib/public/block-config";
import { safeHref } from "@/lib/public/safe-url";

// LINK: زر رابط.
export function LinkBlock({ config }: { config: unknown }) {
  const c = asRecord(config);
  const href = safeHref(c.url);
  const label = str(c.label) || "رابط";
  const subtitle = str(c.subtitle);

  const inner = (
    <div className="flex flex-col items-center">
      <span className="font-semibold">{label}</span>
      {subtitle ? (
        <span className="mt-0.5 text-xs" style={{ opacity: 0.8 }}>
          {subtitle}
        </span>
      ) : null}
    </div>
  );

  const style = {
    background: "var(--pp-btn-bg)",
    color: "var(--pp-btn-text)",
    borderColor: "var(--pp-btn-border)",
    borderRadius: "var(--pp-btn-radius)",
    boxShadow: "var(--pp-shadow)",
  } as React.CSSProperties;

  if (!href) {
    return (
      <div
        className="block w-full border px-5 py-4 text-center opacity-60"
        style={style}
      >
        {inner}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="block w-full border px-5 py-4 text-center transition-transform hover:-translate-y-0.5"
      style={style}
    >
      {inner}
    </a>
  );
}
