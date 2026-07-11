import { asRecord, str, arr } from "@/lib/public/block-config";
import { BlockShell } from "./block-shell";

// FORM: عرض الحقول فقط (الإرسال الفعليّ في برومبت لاحق) — الحقول معطّلة.
export function FormBlock({
  config,
  frosted,
}: {
  config: unknown;
  frosted?: boolean;
}) {
  const c = asRecord(config);
  const title = str(c.title) || "تواصل";
  const submitLabel = str(c.submitLabel) || "إرسال";
  const fields = arr(c.fields)
    .map((f) => {
      const r = asRecord(f);
      return {
        label: str(r.label) || "حقل",
        type: str(r.type) || "text",
        placeholder: str(r.placeholder),
      };
    })
    .slice(0, 12);

  const fieldStyle = {
    background: "color-mix(in oklab, var(--pp-text) 6%, transparent)",
    borderColor: "var(--pp-surface-border)",
    color: "var(--pp-text)",
    borderRadius: "calc(var(--pp-radius) * 0.5)",
  } as React.CSSProperties;

  return (
    <BlockShell frosted={frosted}>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {/* عرض فقط — لا إرسال فعليّ الآن. */}
      <div className="space-y-3" aria-disabled>
        {fields.map((f, i) => (
          <label key={i} className="block">
            <span className="mb-1 block text-xs" style={{ opacity: 0.8 }}>
              {f.label}
            </span>
            {f.type === "textarea" ? (
              <textarea
                disabled
                rows={3}
                placeholder={f.placeholder}
                className="w-full border px-3 py-2 text-sm"
                style={fieldStyle}
              />
            ) : (
              <input
                disabled
                type={f.type === "email" ? "email" : "text"}
                placeholder={f.placeholder}
                className="h-9 w-full border px-3 text-sm"
                style={fieldStyle}
              />
            )}
          </label>
        ))}
        <button
          type="button"
          disabled
          className="w-full border px-4 py-2.5 text-sm font-semibold opacity-70"
          style={{
            background: "var(--pp-btn-bg)",
            color: "var(--pp-btn-text)",
            borderColor: "var(--pp-btn-border)",
            borderRadius: "var(--pp-btn-radius)",
          }}
        >
          {submitLabel}
        </button>
      </div>
    </BlockShell>
  );
}
