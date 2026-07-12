"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ResponsiveImage } from "@/components/public/responsive-image";

const DURATION_MS = 4000;

// عارض ستوري ملء الشاشة بنمط إنستغرام — شريط تقدّم + tap-through + إغلاق.
export function StoryViewer({
  media,
  title,
  onClose,
}: {
  media: string[];
  title: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      if (index < media.length - 1) setIndex((i) => i + 1);
      else onClose();
    }, DURATION_MS);
    return () => clearTimeout(id);
  }, [index, media.length, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setIndex((i) => (i < media.length - 1 ? i + 1 : i));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [media.length, onClose]);

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => {
    if (index < media.length - 1) setIndex((i) => i + 1);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-md">
        {/* أشرطة التقدّم */}
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-2">
          {media.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{
                  width: i < index ? "100%" : i === index ? "100%" : "0%",
                  transition: i === index ? `width ${DURATION_MS}ms linear` : "none",
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-4 z-10 flex items-center justify-between px-3 pt-2">
          <span className="text-sm font-semibold text-white drop-shadow">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-full bg-black/30 p-1.5 text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* الوسائط */}
        <ResponsiveImage
          url={media[index]}
          variant="background"
          alt=""
          className="size-full object-contain"
          sizes="100vw"
        />

        {/* مناطق النقر */}
        <button
          type="button"
          aria-label="السابق"
          onClick={prev}
          className="absolute inset-y-0 start-0 w-1/3"
        />
        <button
          type="button"
          aria-label="التالي"
          onClick={next}
          className="absolute inset-y-0 end-0 w-1/3"
        />
      </div>
    </div>
  );
}
