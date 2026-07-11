import { asRecord, str, arr } from "@/lib/public/block-config";
import { safeCssUrl } from "@/lib/public/safe-url";
import { BlockShell } from "./block-shell";

// GALLERY: شبكة صور أنيقة (يدعم عرض قبل/بعد بصفّين).
export function GalleryBlock({
  config,
  frosted,
}: {
  config: unknown;
  frosted?: boolean;
}) {
  const c = asRecord(config);
  const title = str(c.title);
  const images = arr(c.images)
    .map((it) => {
      const r = asRecord(it);
      const url = safeCssUrl(r.url);
      return url ? { url, alt: str(r.alt) } : null;
    })
    .filter((x): x is { url: string; alt: string } => x !== null)
    .slice(0, 8);

  if (images.length === 0) return null;

  return (
    <BlockShell frosted={frosted}>
      {title ? (
        <p className="mb-3 text-sm font-semibold">{title}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {images.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={img.url}
            alt={img.alt || "صورة"}
            loading="lazy"
            className="aspect-square w-full object-cover"
            style={{ borderRadius: "calc(var(--pp-radius) * 0.6)" }}
          />
        ))}
      </div>
    </BlockShell>
  );
}
