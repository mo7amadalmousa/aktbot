"use client";

import type { ReactNode } from "react";
import { LinkEditor } from "./link-editor";
import { EmbedEditor } from "./embed-editor";
import { GalleryEditor } from "./gallery-editor";
import { FormEditor } from "./form-editor";
import { OfferEditor } from "./offer-editor";
import { BeforeAfterEditor } from "./before-after-editor";
import { StoryEditor } from "./story-editor";
import { StoreEditor } from "./store-editor";
import { NewsletterEditor } from "./newsletter-editor";
import { QrEditor } from "./qr-editor";
import { SocialEditor } from "./social-editor";
import { ComingSoonEditor } from "./coming-soon-editor";

// ── سجلّ محرّرات البلوكات (موازٍ لـ block-registry في العرض) ───────────
// إضافة نوع قابل للتحرير لاحقاً = تسجيل محرّره هنا.

type EditorProps = {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
};

const EDITORS: Record<string, (p: EditorProps) => ReactNode> = {
  LINK: LinkEditor,
  EMBED: EmbedEditor,
  GALLERY: GalleryEditor,
  FORM: FormEditor,
  CONSULTATION: (p) => <OfferEditor {...p} kind="consultation" />,
  PAID_VIDEO: (p) => <OfferEditor {...p} kind="paid_video" />,
  BEFORE_AFTER: BeforeAfterEditor,
  STORY: StoryEditor,
  STORE: StoreEditor,
  NEWSLETTER: NewsletterEditor,
  QR: QrEditor,
  SOCIAL: SocialEditor,
};

export function renderBlockEditor(
  type: string,
  props: EditorProps,
): ReactNode {
  const Editor = EDITORS[type];
  if (Editor) return <Editor {...props} />;
  return <ComingSoonEditor {...props} />;
}
