// ── واجهة البريد المجرّدة ─────────────────────────────────────────────
// كل إرسال يمرّ عبر هذه الواجهة. مزوّد SMTP الحقيقي يُضاف كـ adapter لاحقاً.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailAdapter {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}
