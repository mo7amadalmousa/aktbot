import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { publicPageUrl } from "@/lib/site";

export const runtime = "nodejs";

// يولّد QR لرابط صفحة المبدع فقط (من username مُتحقَّق — لا إدخال حرّ يُحقن).
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;

export async function GET(req: NextRequest) {
  const u = (req.nextUrl.searchParams.get("u") ?? "").toLowerCase();
  const format = req.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const download = req.nextUrl.searchParams.get("dl") === "1";

  if (!USERNAME_RE.test(u)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const target = publicPageUrl(u);
  const opts = { errorCorrectionLevel: "M" as const, margin: 2, width: 512 };

  const cache = "public, max-age=86400";

  if (format === "png") {
    const buf = await QRCode.toBuffer(target, { ...opts, type: "png" });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": "image/png",
        "cache-control": cache,
        ...(download
          ? { "content-disposition": `attachment; filename="aktbot-${u}.png"` }
          : {}),
      },
    });
  }

  const svg = await QRCode.toString(target, { ...opts, type: "svg" });
  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": cache,
      ...(download
        ? { "content-disposition": `attachment; filename="aktbot-${u}.svg"` }
        : {}),
    },
  });
}
