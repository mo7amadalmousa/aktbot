import { Download } from "lucide-react";
import { asRecord, str } from "@/lib/public/block-config";
import { BlockShell } from "./block-shell";

// QR: رمز لرابط صفحة المبدع (aktbot.link/username) + تنزيل PNG/SVG.
// الرمز يُولَّد خادميّاً من username فقط (لا إدخال حرّ).
export function QrBlock({
  config,
  username,
  frosted,
}: {
  config: unknown;
  username?: string;
  frosted?: boolean;
}) {
  const c = asRecord(config);
  const title = str(c.title) || "رمز صفحتي";
  if (!username) return null;

  const base = `/api/qr?u=${encodeURIComponent(username)}`;
  const dl =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium";
  const dlStyle = {
    borderColor: "var(--pp-surface-border)",
    color: "var(--pp-text)",
  } as React.CSSProperties;

  return (
    <BlockShell frosted={frosted}>
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-semibold">{title}</p>
        {/* خلفية بيضاء ثابتة لضمان القراءة على أي قالب */}
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${base}&format=svg`}
            alt="رمز QR لصفحتي"
            width={160}
            height={160}
            className="size-40"
          />
        </div>
        <div className="flex gap-2">
          <a href={`${base}&format=png&dl=1`} className={dl} style={dlStyle}>
            <Download className="size-3.5" /> PNG
          </a>
          <a href={`${base}&format=svg&dl=1`} className={dl} style={dlStyle}>
            <Download className="size-3.5" /> SVG
          </a>
        </div>
      </div>
    </BlockShell>
  );
}
