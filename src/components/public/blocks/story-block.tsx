"use client";

import { useEffect, useState } from "react";
import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { safeCssUrl } from "@/lib/public/safe-url";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { StoryViewer } from "./story-viewer";

const DAY_MS = 24 * 60 * 60 * 1000;

// STORY: شارة دائريّة → عارض ملء الشاشة. اختفاء بالوقت (24س) أو بعد المشاهدة (VIEW_ONCE).
export function StoryBlock({
  config,
  blockId,
}: {
  config: unknown;
  blockId?: string;
}) {
  const c = asRecord(config);
  const media = arr(c.media)
    .map((m) => safeCssUrl(asRecord(m).url))
    .filter((x): x is string => Boolean(x));
  const mode = str(c.mode) === "VIEW_ONCE" ? "VIEW_ONCE" : "TIME_24H";
  const publishedAt = num(c.publishedAt) ?? 0;
  const title = str(c.title) || "ستوري";

  const [open, setOpen] = useState(false);
  // VIEW_ONCE: أخفِ حتى نعرف حالة المشاهدة (تجنّب وميض ستوري مُشاهَدة).
  const [hidden, setHidden] = useState(mode === "VIEW_ONCE");

  useEffect(() => {
    if (mode !== "VIEW_ONCE" || !blockId) {
      setHidden(false);
      return;
    }
    let active = true;
    fetch(`/api/story/status?block=${encodeURIComponent(blockId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setHidden(Boolean(d.viewed));
      })
      .catch(() => {
        if (active) setHidden(false);
      });
    return () => {
      active = false;
    };
  }, [mode, blockId]);

  const expired =
    mode === "TIME_24H" && publishedAt > 0 && Date.now() > publishedAt + DAY_MS;

  if (media.length === 0 || expired || hidden) return null;

  const openStory = () => {
    setOpen(true);
    if (blockId) {
      fetch("/api/story/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blockId }),
      }).catch(() => {});
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openStory}
        className="flex w-full items-center gap-3 rounded-2xl border p-3"
        style={{
          background: "var(--pp-surface)",
          borderColor: "var(--pp-surface-border)",
          color: "var(--pp-text)",
          borderRadius: "var(--pp-radius)",
          boxShadow: "var(--pp-shadow)",
        }}
      >
        <span
          className="flex size-14 shrink-0 items-center justify-center rounded-full p-[3px]"
          style={{
            background:
              "conic-gradient(from 180deg, var(--pp-accent), #f59e0b, #ec4899, var(--pp-accent))",
          }}
        >
          <span className="size-full overflow-hidden rounded-full border-2 border-[var(--pp-surface)]">
            <ResponsiveImage
              url={media[0]}
              variant="gallery"
              alt=""
              className="size-full object-cover"
              sizes="56px"
            />
          </span>
        </span>
        <span className="min-w-0 flex-1 text-start">
          <span className="block truncate font-semibold">{title}</span>
          <span className="block text-xs" style={{ opacity: 0.7 }}>
            {mode === "TIME_24H" ? "متاح ٢٤ ساعة" : "مشاهدة واحدة"} ·{" "}
            {media.length} لقطة
          </span>
        </span>
      </button>

      {open ? (
        <StoryViewer
          media={media}
          title={title}
          onClose={() => {
            setOpen(false);
            if (mode === "VIEW_ONCE") setHidden(true);
          }}
        />
      ) : null}
    </>
  );
}
