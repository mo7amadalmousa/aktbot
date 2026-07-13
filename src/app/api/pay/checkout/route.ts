import { NextRequest, NextResponse } from "next/server";
import { createOrderForBlock, CheckoutError } from "@/lib/payments/service";
import {
  ATTR_COOKIE,
  resolveActiveParticipationRef,
} from "@/lib/attribution/engine";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const blockId = String(form.get("blockId") ?? "");
  const buyerName = String(form.get("buyerName") ?? "");
  const buyerEmail = String(form.get("buyerEmail") ?? "");
  const instructions = String(form.get("instructions") ?? "");

  const participationId = await resolveActiveParticipationRef(
    req.cookies.get(ATTR_COOKIE)?.value,
    String(form.get("attrCode") ?? "") || null,
  );

  try {
    const { checkoutUrl } = await createOrderForBlock({
      blockId,
      buyerName,
      buyerEmail,
      instructions: instructions || undefined,
      participationId,
    });
    return NextResponse.redirect(new URL(checkoutUrl, req.url), { status: 303 });
  } catch (e) {
    const msg =
      e instanceof CheckoutError ? e.message : "تعذّر بدء عملية الدفع.";
    const url = new URL(`/checkout/${blockId}`, req.url);
    url.searchParams.set("error", msg);
    return NextResponse.redirect(url, { status: 303 });
  }
}
