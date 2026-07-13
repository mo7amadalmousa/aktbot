import { NextRequest, NextResponse } from "next/server";
import { createOrderForProduct, CheckoutError } from "@/lib/payments/service";

export const runtime = "nodejs";

// بدء شراء منتج رقميّ — السعر من القاعدة (لا من العميل)، ثم تحويل لصفحة الدفع.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const productId = String(form.get("productId") ?? "");
  const buyerName = String(form.get("buyerName") ?? "");
  const buyerEmail = String(form.get("buyerEmail") ?? "");

  try {
    const { checkoutUrl } = await createOrderForProduct({
      productId,
      buyerName,
      buyerEmail,
    });
    return NextResponse.redirect(new URL(checkoutUrl, req.url), { status: 303 });
  } catch (e) {
    const msg = e instanceof CheckoutError ? e.message : "تعذّر بدء عملية الدفع.";
    const url = new URL(`/store/${productId}`, req.url);
    url.searchParams.set("error", msg);
    return NextResponse.redirect(url, { status: 303 });
  }
}
