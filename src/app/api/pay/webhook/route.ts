import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { processPaymentEvent } from "@/lib/payments/service";

export const runtime = "nodejs";

// نقطة webhook الخلفيّة — الحقيقة من هنا (لا ردّ المتصفّح). المزوّد الحقيقيّ يتحقّق
// من التوقيع قبل التطبيع. idempotent عبر providerRef (لا يُسجَّل الدفع مرتين).
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = getPaymentProvider().handleWebhook(payload);
  if (!event) {
    return NextResponse.json({ ok: false, error: "unknown event" }, { status: 400 });
  }

  const result = await processPaymentEvent(event);
  return NextResponse.json({
    ok: true,
    handled: result.handled,
    alreadyProcessed: Boolean(result.alreadyProcessed),
  });
}
