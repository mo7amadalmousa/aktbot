"use client";

import { str } from "@/lib/public/block-config";

// محرّر الأنواع «قريباً» — عرض عنوان فقط (تُرتَّب/تُخفى/تُحذف؛ لا تُحرَّر بعمق حتى تُفعّل مع الدفع).
export function ComingSoonEditor({
  config,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">
        {str(config.title) || "هذا القسم"}
      </p>
      <p className="mt-1 text-xs">
        هذا النوع يُفعّل في تحديث قادم (يحتاج الدفع). يمكنك ترتيبه أو إخفاؤه أو
        حذفه الآن.
      </p>
    </div>
  );
}
