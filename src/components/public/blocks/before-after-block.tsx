"use client";

import { useRef, useState } from "react";
import { MoveHorizontal, MoveVertical } from "lucide-react";
import { asRecord, str } from "@/lib/public/block-config";
import { safeCssUrl } from "@/lib/public/safe-url";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { BlockShell } from "./block-shell";

// BEFORE_AFTER: سلايدر منزلق يقارن صورتين — ماوس + لمس. مستقلّ عن GALLERY.
export function BeforeAfterBlock({
  config,
  frosted,
}: {
  config: unknown;
  frosted?: boolean;
}) {
  const c = asRecord(config);
  const beforeUrl = safeCssUrl(c.beforeUrl);
  const afterUrl = safeCssUrl(c.afterUrl);
  const vertical = str(c.orientation) === "vertical";
  const beforeLabel = str(c.beforeLabel);
  const afterLabel = str(c.afterLabel);

  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [pos, setPos] = useState(50);

  if (!beforeUrl || !afterUrl) {
    return (
      <BlockShell frosted={frosted}>
        <p className="text-center text-sm" style={{ opacity: 0.8 }}>
          أضِف صورتَي «قبل» و«بعد».
        </p>
      </BlockShell>
    );
  }

  const update = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = vertical
      ? (clientY - r.top) / r.height
      : (clientX - r.left) / r.width;
    setPos(Math.min(100, Math.max(0, p * 100)));
  };

  const beforeClip = vertical
    ? `inset(0 0 ${100 - pos}% 0)`
    : `inset(0 ${100 - pos}% 0 0)`;

  return (
    <BlockShell frosted={frosted} padded={false} className="overflow-hidden">
      <div
        ref={ref}
        className="relative w-full cursor-ew-resize select-none"
        style={{
          aspectRatio: "3 / 4",
          touchAction: vertical ? "pan-x" : "pan-y",
        }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          update(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging.current) update(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {/* بعد (كامل) */}
        <ResponsiveImage
          url={afterUrl}
          variant="gallery"
          alt="بعد"
          className="absolute inset-0 size-full object-cover"
          sizes="(max-width: 640px) 100vw, 400px"
        />
        {/* قبل (مقصوص) */}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: beforeClip }}>
          <ResponsiveImage
            url={beforeUrl}
            variant="gallery"
            alt="قبل"
            className="absolute inset-0 size-full object-cover"
            sizes="(max-width: 640px) 100vw, 400px"
          />
        </div>

        {beforeLabel ? (
          <span className="absolute bottom-2 start-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white">
            {beforeLabel}
          </span>
        ) : null}
        {afterLabel ? (
          <span className="absolute bottom-2 end-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white">
            {afterLabel}
          </span>
        ) : null}

        {/* المقبض */}
        <div
          className="absolute bg-white/90 shadow"
          style={
            vertical
              ? { top: `${pos}%`, insetInline: 0, height: 2, transform: "translateY(-1px)" }
              : { left: `${pos}%`, insetBlock: 0, width: 2, transform: "translateX(-1px)" }
          }
        >
          <span
            className="absolute flex size-8 items-center justify-center rounded-full bg-white text-foreground shadow-md"
            style={{
              top: vertical ? -16 : "50%",
              left: vertical ? "50%" : -16,
              transform: "translate(-50%, -50%)",
            }}
          >
            {vertical ? (
              <MoveVertical className="size-4" />
            ) : (
              <MoveHorizontal className="size-4" />
            )}
          </span>
        </div>
      </div>
    </BlockShell>
  );
}
