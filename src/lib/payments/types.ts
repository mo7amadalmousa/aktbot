// ── طبقة الدفع المحايدة (Payment Abstraction) ─────────────────────────
// التطبيق لا يعرف أيّ مزوّد. adapters خلف هذه الواجهة: mock الآن،
// Iyzico/Stripe لاحقاً — دون إعادة بناء. الحقيقة من webhook خلفيّ.

export type NormalizedEventType = "payment.succeeded" | "payment.failed";

// حدث داخليّ موحّد — كل webhooks المزوّدين تُطبَّع إليه.
export interface NormalizedEvent {
  type: NormalizedEventType;
  providerRef: string;
  raw?: unknown;
}

export interface CreatePaymentInput {
  orderId: string;
  amount: number; // minor units
  currency: string;
  description: string;
  buyerEmail: string;
}

export interface CreatePaymentResult {
  providerRef: string;
  // وجهة صفحة الدفع (mock: صفحة داخليّة · مزوّد حقيقيّ: صفحة مستضافة).
  checkoutUrl: string;
}

export interface PaymentProvider {
  readonly id: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  // تطبيع حمولة webhook الخام إلى حدث داخليّ موحّد (أو null إن غير معروف).
  handleWebhook(payload: unknown): NormalizedEvent | null;
  // (بنية جاهزة — تُفعّل مع مزوّد حقيقيّ)
  refund(providerRef: string): Promise<{ ok: boolean }>;
  getStatus(providerRef: string): Promise<NormalizedEventType | "pending">;
}
