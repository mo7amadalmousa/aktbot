import type {
  PaymentProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  NormalizedEvent,
} from "./types";
import { asRecord, str } from "@/lib/public/block-config";

// MockPaymentAdapter — يحاكي مزوّد دفع محلياً (بلا اتصال خارجيّ).
// createPayment يوجّه لصفحة دفع داخليّة يختار فيها المشتري نجاح/فشل،
// وهي تُطلق webhook داخليّاً إلى /api/pay/webhook. الحقيقة من الـwebhook.
export const mockPaymentAdapter: PaymentProvider = {
  id: "mock",

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerRef = `mock_${input.orderId}`;
    return {
      providerRef,
      checkoutUrl: `/pay/${input.orderId}`,
    };
  },

  handleWebhook(payload: unknown): NormalizedEvent | null {
    const p = asRecord(payload);
    const type = str(p.type);
    const providerRef = str(p.providerRef);
    if (!providerRef) return null;
    if (type === "payment.succeeded" || type === "payment.failed") {
      return { type, providerRef, raw: payload };
    }
    return null;
  },

  async refund(): Promise<{ ok: boolean }> {
    // بنية جاهزة — تُفعّل مع مزوّد حقيقيّ.
    return { ok: true };
  },

  async getStatus() {
    return "pending" as const;
  },
};
