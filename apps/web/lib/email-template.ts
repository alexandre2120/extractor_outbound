export type OutboundEmailTemplateInput = {
  subject?: string | null;
  body: string;
};

const defaultSubject = "Olá";

export function renderOutboundEmailText(body: string): string {
  return normalizePlainText(body);
}

export function renderOutboundEmailHtml({
  subject,
  body,
}: OutboundEmailTemplateInput): string {
  const safeSubject = escapeHtml(normalizeSubject(subject));
  const safePreview = escapeHtml(makePreviewText(body));
  const bodyHtml = renderBodyHtml(body);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>${safeSubject}</title>
  </head>
  <body data-template="outbound-email" style="margin:0; padding:0; background:#f6f7f9; color:#1f2328; font-family:Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; line-height:1px;">
      ${safePreview}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; background:#f6f7f9;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; border-collapse:separate; border-spacing:0; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px;">
            <tr>
              <td style="padding:28px 28px 30px 28px; font-size:16px; line-height:1.62; color:#2f3337;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderBodyHtml(body: string): string {
  const paragraphs = normalizePlainText(body)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return `<p style="margin:0; color:#2f3337;">${escapeHtml(defaultSubject)}</p>`;
  }

  return paragraphs
    .map((paragraph, index) => {
      const margin = index === 0 ? "0 0 16px 0" : "16px 0 0 0";
      const html = escapeHtml(paragraph).replace(/\n/g, "<br />");

      return `<p style="margin:${margin}; color:#2f3337;">${html}</p>`;
    })
    .join("\n                ");
}

function normalizeSubject(subject?: string | null): string {
  return subject?.trim() || defaultSubject;
}

function makePreviewText(body: string): string {
  const compact = normalizePlainText(body).replace(/\s+/g, " ");

  if (compact.length <= 140) return compact;

  return `${compact.slice(0, 137).trimEnd()}...`;
}

function normalizePlainText(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
