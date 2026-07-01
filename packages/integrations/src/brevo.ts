/**
 * Client Brevo — envio transacional. Doc: POST https://api.brevo.com/v3/smtp/email
 */

export interface SendEmailInput {
  to: { email: string; name?: string };
  subject: string;
  html?: string;
  text?: string;
}

export interface SendEmailResult {
  messageId: string;
  raw: unknown;
}

export class BrevoClient {
  constructor(
    private apiKey: string,
    private sender: { email: string; name?: string },
  ) {}

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: this.sender,
        to: [input.to],
        subject: input.subject,
        htmlContent: input.html ?? `<p>${input.text ?? ""}</p>`,
        ...(input.text ? { textContent: input.text } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo ${res.status}: ${body.slice(0, 300)}`);
    }
    const d = (await res.json()) as Record<string, any>;
    return { messageId: d.messageId ?? "", raw: d };
  }

  /** Verifica a conta (read-only) — útil para healthcheck. */
  async account(): Promise<unknown> {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": this.apiKey, accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}`);
    return res.json();
  }
}
