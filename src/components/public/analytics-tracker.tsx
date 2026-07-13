"use client";

import { useEffect } from "react";

// تتبّع خفيف لا-متزامن — لا يؤثّر في العرض ولا يكسر cache الصفحة (beacon منفصل).
// إن كان JS معطّلاً أو beacon غير مدعوم، الصفحة تعمل بلا تتبّع (تحسين لا اعتماد).
function beacon(url: string, data: Record<string, unknown>) {
  try {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      if (navigator.sendBeacon(url, blob)) return;
    }
    // fallback: fetch keepalive (لا ننتظر النتيجة)
    void fetch(url, {
      method: "POST",
      body: blob,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  } catch {
    /* تجاهُل — التتبّع تحسينيّ */
  }
}

export function AnalyticsTracker({ username }: { username: string }) {
  useEffect(() => {
    // 1) زيارة الصفحة (مرّة لكل تحميل).
    beacon("/api/analytics/view", {
      username,
      ref: typeof document !== "undefined" ? document.referrer : "",
    });

    // 2) نقرات البلوكات (تفويض حدث واحد — يجد أقرب [data-block-id]).
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.("[data-block-id]") as HTMLElement | null;
      const blockId = el?.getAttribute("data-block-id");
      if (blockId) beacon("/api/analytics/click", { blockId });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [username]);

  return null;
}
