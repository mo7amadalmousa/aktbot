import {
  assetUrl,
  variantUrl,
  isManagedPath,
  VARIANT_WIDTHS,
  DEFAULT_SIZES,
  type ImageVariant,
} from "@/lib/storage/asset";

// مكوّن صورة موحّد — يبني srcset للصور المُدارة (أحجام متعدّدة عبر CDN)،
// ويعرض الصور الخارجيّة/القديمة كما هي (fallback). lazy + decoding=async +
// أبعاد ثابتة (width/height أو حاوية بأبعاد) لمنع layout shift (CLS).
export function ResponsiveImage({
  url,
  variant,
  alt = "",
  className,
  sizes,
  width,
  height,
}: {
  url: string;
  variant: ImageVariant;
  alt?: string;
  className?: string;
  sizes?: string;
  width?: number;
  height?: number;
}) {
  if (!url) return null;

  const src = assetUrl(url);
  const common = {
    alt,
    loading: "lazy" as const,
    decoding: "async" as const,
    className,
    width,
    height,
  };

  // خارجيّ/قديم (بلا متغيّرات) → صورة واحدة.
  if (!isManagedPath(url)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} {...common} />;
  }

  const widths = VARIANT_WIDTHS[variant];
  const last = widths[widths.length - 1];
  const srcSet = widths
    .map((w) => `${w === last ? src : assetUrl(variantUrl(url, w))} ${w}w`)
    .join(", ");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} srcSet={srcSet} sizes={sizes ?? DEFAULT_SIZES[variant]} {...common} />
  );
}
