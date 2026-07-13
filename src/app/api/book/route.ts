import { NextRequest, NextResponse } from "next/server";
import {
  loadBookableConsultation,
  createFreeBooking,
  createPaidBookingOrder,
  BookingError,
} from "@/lib/booking/service";

export const runtime = "nodejs";

// تدفّق الحجز العامّ: مجانيّ → تأكيد مباشر · مدفوع → hold ثمّ صفحة الدفع.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const blockId = String(form.get("blockId") ?? "");
  const buyerName = String(form.get("buyerName") ?? "");
  const buyerEmail = String(form.get("buyerEmail") ?? "");
  const startISO = String(form.get("startISO") ?? "");

  const backWithError = (msg: string) => {
    const url = new URL(`/book/${blockId}`, req.url);
    url.searchParams.set("error", msg);
    return NextResponse.redirect(url, { status: 303 });
  };

  try {
    const loaded = await loadBookableConsultation(blockId);
    if (!loaded) return backWithError("الحجز غير متاح لهذا العنصر.");

    if (loaded.config.mode === "PAID") {
      const { orderId } = await createPaidBookingOrder({
        blockId,
        buyerName,
        buyerEmail,
        startISO,
      });
      return NextResponse.redirect(new URL(`/pay/${orderId}`, req.url), {
        status: 303,
      });
    }

    const booking = await createFreeBooking({
      blockId,
      buyerName,
      buyerEmail,
      startISO,
    });
    const url = new URL(`/booking/${booking.id}`, req.url);
    url.searchParams.set("e", booking.buyerEmail);
    return NextResponse.redirect(url, { status: 303 });
  } catch (e) {
    return backWithError(
      e instanceof BookingError ? e.message : "تعذّر إتمام الحجز.",
    );
  }
}
