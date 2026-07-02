import type { EmailTemplateSettingsView } from "./template-settings";
import { normalizeHexColor, sanitizeHttpsUrl } from "./template-settings";

export type OutboundEmailTemplateInput = {
  subject?: string | null;
  body: string;
  settings?: EmailTemplateSettingsView | null;
};

const defaultSubject = "Olá";
const defaultPrimaryColor = "#1f2328";
const defaultBackgroundColor = "#f6f7f9";
const defaultFontFamily = "Arial, Helvetica, sans-serif";

type NormalizedTheme = {
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  signature: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
};

export function renderOutboundEmailText(body: string): string {
  return normalizePlainText(body);
}

export function renderOutboundEmailHtml({
  subject,
  body,
  settings,
}: OutboundEmailTemplateInput): string {
  const safeSubject = escapeHtml(normalizeSubject(subject));
  const safePreview = escapeHtml(makePreviewText(body));
  const theme = normalizeTheme(settings);
  const bodyHtml = renderBodyHtml(body);
  const logoHtml = renderLogoHtml(theme);
  const signatureHtml = renderSignatureHtml(theme);
  const ctaHtml = renderCtaHtml(theme);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>${safeSubject}</title>
  </head>
  <body data-template="outbound-email" style="margin:0; padding:0; background:${theme.backgroundColor}; color:${defaultPrimaryColor}; font-family:${theme.fontFamily};">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; line-height:1px;">
      ${safePreview}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; background:${theme.backgroundColor};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; border-collapse:separate; border-spacing:0; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px;">
            <tr>
              <td style="padding:28px 28px 30px 28px; font-size:16px; line-height:1.62; color:#2f3337; font-family:${theme.fontFamily};">
                ${logoHtml}
                ${bodyHtml}
                ${signatureHtml}
                ${ctaHtml}
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

function normalizeTheme(
  settings?: EmailTemplateSettingsView | null,
): NormalizedTheme {
  return {
    brandName: clean(settings?.brandName),
    logoUrl: sanitizeHttpsUrl(settings?.logoUrl),
    primaryColor: normalizeHexColor(settings?.primaryColor) ?? defaultPrimaryColor,
    backgroundColor:
      normalizeHexColor(settings?.backgroundColor) ?? defaultBackgroundColor,
    fontFamily: sanitizeFontFamily(settings?.fontFamily),
    signature: clean(settings?.signature),
    ctaLabel: clean(settings?.ctaLabel),
    ctaUrl: sanitizeHttpsUrl(settings?.ctaUrl),
  };
}

function sanitizeFontFamily(value?: string | null): string {
  const text = clean(value);
  if (!text || /[;"'<>]/.test(text)) return defaultFontFamily;
  return `${text}, ${defaultFontFamily}`;
}

function renderLogoHtml(theme: NormalizedTheme): string {
  if (!theme.logoUrl) return "";
  const alt = escapeHtml(theme.brandName ?? "Logo");

  return `<div style="margin:0 0 22px 0;"><img src="${theme.logoUrl}" alt="${alt}" width="120" style="display:block; max-width:120px; height:auto; border:0;"></div>`;
}

function renderSignatureHtml(theme: NormalizedTheme): string {
  if (!theme.signature) return "";
  const html = escapeHtml(theme.signature).replace(/\n/g, "<br />");

  return `<p style="margin:22px 0 0 0; color:#2f3337;">${html}</p>`;
}

function renderCtaHtml(theme: NormalizedTheme): string {
  if (!theme.ctaLabel || !theme.ctaUrl) return "";

  return `<p style="margin:22px 0 0 0;"><a href="${theme.ctaUrl}" style="color:${theme.primaryColor}; text-decoration:underline;">${escapeHtml(theme.ctaLabel)}</a></p>`;
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

function clean(value?: string | null): string | null {
  const text = value?.trim();
  return text ? text : null;
}
