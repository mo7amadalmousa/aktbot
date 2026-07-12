"use client";

import type { LayoutId } from "@/lib/public/page-theme";

// مصغّر بصريّ تخطيطيّ لكل layout — يعكس بنيته ليختار المبدع بعينه.
// عناصر مجرّدة (أفاتار = دائرة · بلوك = شريط/بطاقة).

const dot = "rounded-full bg-foreground/40";
const bar = "rounded bg-foreground/15";

export function LayoutThumbnail({ layout }: { layout: LayoutId }) {
  const frame =
    "flex h-16 w-full flex-col items-stretch gap-1.5 rounded-md bg-muted p-2";

  if (layout === "INK") {
    return (
      <div className={frame}>
        <span className={`${dot} mx-auto size-4`} />
        <span className={`${bar} h-2 w-full`} />
        <span className={`${bar} h-2 w-full`} />
        <span className={`${bar} h-2 w-full`} />
      </div>
    );
  }

  if (layout === "TENTACLES") {
    return (
      <div className={frame}>
        <div className="flex items-center gap-1.5">
          <span className={`${dot} size-4`} />
          <span className={`${bar} h-2 flex-1`} />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          <span className={`${bar} row-span-2`} />
          <span className={bar} />
          <span className={bar} />
        </div>
      </div>
    );
  }

  if (layout === "REEF") {
    return (
      <div className={frame}>
        <span className={`${dot} mx-auto size-6`} />
        <span className={`${bar} h-3 w-full`} />
        <span className={`${bar} mx-auto h-2 w-2/3`} />
      </div>
    );
  }

  // CORAL — بطاقات مزاحة
  return (
    <div className={frame}>
      <span className={`${dot} mx-auto size-4`} />
      <span className={`${bar} me-4 h-2.5`} />
      <span className={`${bar} ms-4 h-2.5`} />
      <span className={`${bar} me-4 h-2.5`} />
    </div>
  );
}
