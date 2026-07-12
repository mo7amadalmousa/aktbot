import type { ReactNode } from "react";
import type { BlockType } from "@/generated/prisma/enums";
import { LinkBlock } from "@/components/public/blocks/link-block";
import { EmbedBlock } from "@/components/public/blocks/embed-block";
import { GalleryBlock } from "@/components/public/blocks/gallery-block";
import { FormBlock } from "@/components/public/blocks/form-block";
import { OfferBlock } from "@/components/public/blocks/offer-block";
import { BeforeAfterBlock } from "@/components/public/blocks/before-after-block";
import { StoryBlock } from "@/components/public/blocks/story-block";
import { StoreBlock } from "@/components/public/blocks/store-block";
import { NewsletterBlock } from "@/components/public/blocks/newsletter-block";
import { QrBlock } from "@/components/public/blocks/qr-block";
import { ComingSoonBlock } from "@/components/public/blocks/coming-soon-block";

// ── سجلّ البلوكات: type → مكوّن عرض ───────────────────────────────────
// إضافة نوع لاحقاً = تسجيل مُصيِّر هنا، بلا لمس الصفحة. الأنواع غير المسجّلة
// تسقط تلقائياً إلى ComingSoonBlock (عرض أساسيّ «قريباً») فلا تكسر الصفحة.

type RenderArgs = {
  config: unknown;
  frosted: boolean;
  type: BlockType;
  blockId: string;
  interactive: boolean;
  username?: string;
};
type BlockRenderer = (args: RenderArgs) => ReactNode;

export const blockRegistry: Partial<Record<BlockType, BlockRenderer>> = {
  // الموجة 1 — مُفعّلة
  LINK: ({ config }) => <LinkBlock config={config} />,
  EMBED: ({ config, frosted }) => <EmbedBlock config={config} frosted={frosted} />,
  GALLERY: ({ config, frosted }) => (
    <GalleryBlock config={config} frosted={frosted} />
  ),
  FORM: ({ config, frosted }) => <FormBlock config={config} frosted={frosted} />,
  // بلوكات مدفوعة — زرّ شراء فعّال على الصفحة العامّة (interactive)
  CONSULTATION: ({ config, frosted, blockId, interactive }) => (
    <OfferBlock
      config={config}
      kind="consultation"
      frosted={frosted}
      blockId={blockId}
      interactive={interactive}
    />
  ),
  PAID_VIDEO: ({ config, frosted, blockId, interactive }) => (
    <OfferBlock
      config={config}
      kind="paid_video"
      frosted={frosted}
      blockId={blockId}
      interactive={interactive}
    />
  ),
  // بصريّة
  BEFORE_AFTER: ({ config, frosted }) => (
    <BeforeAfterBlock config={config} frosted={frosted} />
  ),
  STORY: ({ config, blockId }) => (
    <StoryBlock config={config} blockId={blockId} />
  ),
  STORE: ({ config, frosted }) => <StoreBlock config={config} frosted={frosted} />,
  NEWSLETTER: ({ config, frosted, username }) => (
    <NewsletterBlock config={config} username={username} frosted={frosted} />
  ),
  QR: ({ config, frosted, username }) => (
    <QrBlock config={config} username={username} frosted={frosted} />
  ),
  // كل الأنواع مسجّلة الآن — لا نوع «قريباً».
};

export interface PublicBlock {
  id: string;
  type: BlockType;
  config: unknown;
}

export function renderBlock(
  block: PublicBlock,
  frosted: boolean,
  opts?: { interactive?: boolean; username?: string },
): ReactNode {
  const renderer = blockRegistry[block.type];
  if (renderer) {
    return renderer({
      config: block.config,
      frosted,
      type: block.type,
      blockId: block.id,
      interactive: opts?.interactive ?? false,
      username: opts?.username,
    });
  }
  return (
    <ComingSoonBlock config={block.config} type={block.type} frosted={frosted} />
  );
}
