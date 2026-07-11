import type { BlockType } from "@/generated/prisma/enums";
import { asRecord, str } from "@/lib/public/block-config";
import { BlockShell, ComingSoonPill } from "./block-shell";

// STORE / NEWSLETTER / QR (وأي نوع غير مسجّل): عرض أساسيّ أنيق «قريباً».
const DEFAULTS: Partial<Record<BlockType, string>> = {
  STORE: "المتجر",
  NEWSLETTER: "النشرة البريدية",
  QR: "رمز QR",
};

export function ComingSoonBlock({
  config,
  type,
  frosted,
}: {
  config: unknown;
  type: BlockType;
  frosted?: boolean;
}) {
  const c = asRecord(config);
  const title = str(c.title) || DEFAULTS[type] || "قسم";
  const description = str(c.description);

  return (
    <BlockShell frosted={frosted}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{title}</p>
        <ComingSoonPill />
      </div>
      {description ? (
        <p className="mt-1 text-sm" style={{ opacity: 0.8 }}>
          {description}
        </p>
      ) : null}
    </BlockShell>
  );
}
