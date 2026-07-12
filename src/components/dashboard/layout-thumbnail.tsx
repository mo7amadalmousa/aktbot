"use client";

import type { LayoutId } from "@/lib/public/page-theme";

// مصغّر بصريّ ملوّن بتوقيع كل تخطيط (مطابق v2) — ليختار المبدع بعينه.
const TEAL = "#278A8F";

export function LayoutThumbnail({ layout }: { layout: LayoutId }) {
  if (layout === "INK") {
    return (
      <div className="flex h-16 w-full flex-col items-stretch gap-1.5 rounded-md p-2" style={{ background: "#FBFBFA" }}>
        <span className="mx-auto size-4 rounded-full" style={{ background: "#d8b7c4" }} />
        <span className="h-2.5 w-full rounded" style={{ background: "#fff", border: "1px solid #ECEDED" }} />
        <span className="h-2.5 w-full rounded" style={{ background: TEAL }} />
        <span className="h-2.5 w-full rounded" style={{ background: "#fff", border: "1px solid #ECEDED" }} />
      </div>
    );
  }
  if (layout === "TENTACLES") {
    return (
      <div className="flex h-16 w-full flex-col gap-1.5 rounded-md p-2" style={{ background: "#0E0E10" }}>
        <div className="flex items-center gap-1.5">
          <span className="size-4 rounded" style={{ background: "#d8b7c4" }} />
          <span className="h-2 flex-1 rounded" style={{ background: "#1A1A1E" }} />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          <span className="rounded" style={{ background: TEAL }} />
          <span className="rounded" style={{ background: "#1A1A1E" }} />
        </div>
      </div>
    );
  }
  if (layout === "REEF") {
    return (
      <div className="flex h-16 w-full flex-col gap-1.5 overflow-hidden rounded-md" style={{ background: "#fff" }}>
        <span className="h-7 w-full" style={{ background: "linear-gradient(160deg,#f6d5e0,#7b8fd4)" }} />
        <div className="flex flex-col gap-1.5 px-2 pb-2">
          <span className="h-2 w-full rounded" style={{ background: "#eef0f0" }} />
          <span className="h-2 w-full rounded" style={{ background: "#eef0f0" }} />
        </div>
      </div>
    );
  }
  // CORAL
  return (
    <div className="flex h-16 w-full flex-col items-center gap-1.5 rounded-md p-2" style={{ background: "linear-gradient(160deg,#278A8F,#134b4e)" }}>
      <span className="size-4 rounded-full border-2 border-white/40" style={{ background: "#d8b7c4" }} />
      <span className="h-2.5 w-full rounded bg-white" />
      <span className="h-2.5 w-full rounded bg-white" />
    </div>
  );
}
