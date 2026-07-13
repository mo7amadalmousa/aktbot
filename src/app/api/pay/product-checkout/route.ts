import { NextRequest, NextResponse } from "next/server";
import {
  createOrderForProduct,
  CheckoutError,
  type ShippingInput,
} from "@/lib/payments/service";

export const runtime = "nodejs";

// بدء شراء منتج (رقميّ/كورس/فيزيائيّ) — السعر والرسوم من القاعدة، ثم صفحة الدفع.
// الفيزيائيّ يمرّر عنوان الشحن؛ الأنواع الأخرى تتجاهله.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const productId = String(form.get("productId") ?? "");
  const buyerName = String(form.get("buyerName") ?? "");
  const buyerEmail = String(form.get("buyerEmail") ?? "");

  const shipping: ShippingInput = {
    fullName: String(form.get("ship_fullName") ?? ""),
    phone: String(form.get("ship_phone") ?? ""),
    country: String(form.get("ship_country") ?? ""),
    city: String(form.get("ship_city") ?? ""),
    line: String(form.get("ship_line") ?? ""),
    postalCode: String(form.get("ship_postalCode") ?? ""),
  };
  const hasShipping = Boolean(shipping.fullName || shipping.line || shipping.city);

  try {
    const { checkoutUrl } = await createOrderForProduct({
      productId,
      buyerName,
      buyerEmail,
      shipping: hasShipping ? shipping : undefined,
    });
    return NextResponse.redirect(new URL(checkoutUrl, req.url), { status: 303 });
  } catch (e) {
    const msg = e instanceof CheckoutError ? e.message : "تعذّر بدء عملية الدفع.";
    const url = new URL(`/store/${productId}`, req.url);
    url.searchParams.set("error", msg);
    return NextResponse.redirect(url, { status: 303 });
  }
}
