"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// تمرير ناعم (Lenis · MIT) — يحترم prefers-reduced-motion (يتوقّف تماماً).
// lerp 0.1 ضمن المدى الموصى به (0.05–0.15). لا GSAP.
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
