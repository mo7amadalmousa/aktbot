import type { PaymentProvider } from "./types";
import { mockPaymentAdapter } from "./mock-adapter";

// اختيار المزوّد عبر إعداد. أضِف iyzico/stripe هنا لاحقاً دون تغيير المستدعي.
const PROVIDERS: Record<string, PaymentProvider> = {
  mock: mockPaymentAdapter,
};

export function getPaymentProvider(): PaymentProvider {
  const id = process.env.PAYMENT_PROVIDER || "mock";
  return PROVIDERS[id] ?? mockPaymentAdapter;
}

export * from "./types";
export * from "./money";
