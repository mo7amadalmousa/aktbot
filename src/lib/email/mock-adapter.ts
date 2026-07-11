import type { EmailAdapter } from "./types";

// mock adapter للتطوير: يطبع الرسالة (بما فيها الرابط) في الكونسول بدل إرسال فعليّ.
export const mockEmailAdapter: EmailAdapter = {
  name: "mock",
  async send(message) {
    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        "📧 ───────── [MOCK EMAIL] ─────────",
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "───────────────────────────────────",
        "",
      ].join("\n"),
    );
  },
};
