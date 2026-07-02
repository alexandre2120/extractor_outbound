export type EmailTemplateSettingsView = {
  brandName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  fontFamily?: string | null;
  senderName?: string | null;
  senderRole?: string | null;
  signature?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
};

export type TemplateSettingsDraft = EmailTemplateSettingsView & {
  websiteUrl: string | null;
  offerSummary: string | null;
  valueProposition: string | null;
  tone: string | null;
};

type RawValue = FormDataEntryValue | string | null | undefined;

export function normalizeHexColor(value: RawValue): string | null {
  const text = clean(value);
  if (!text) return null;
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toUpperCase() : null;
}

export function normalizeWebsiteUrl(value: RawValue): string | null {
  const text = clean(value);
  if (!text) return null;
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  return sanitizeHttpsUrl(withProtocol);
}

export function sanitizeHttpsUrl(value: RawValue): string | null {
  const text = clean(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:") return null;
    if (url.pathname === "/" && !url.search && !url.hash) {
      return `${url.protocol}//${url.host}`;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeTemplateSettingsDraft(
  input: Record<string, RawValue>,
): TemplateSettingsDraft {
  return {
    websiteUrl: normalizeWebsiteUrl(input.websiteUrl),
    brandName: clean(input.brandName),
    logoUrl: sanitizeHttpsUrl(input.logoUrl),
    primaryColor: normalizeHexColor(input.primaryColor),
    accentColor: normalizeHexColor(input.accentColor),
    backgroundColor: normalizeHexColor(input.backgroundColor),
    fontFamily: clean(input.fontFamily),
    senderName: clean(input.senderName),
    senderRole: clean(input.senderRole),
    signature: clean(input.signature),
    ctaLabel: clean(input.ctaLabel),
    ctaUrl: sanitizeHttpsUrl(input.ctaUrl),
    offerSummary: clean(input.offerSummary),
    valueProposition: clean(input.valueProposition),
    tone: clean(input.tone),
  };
}

export function shouldApplySuggestedOffer(
  currentOffer: string | null | undefined,
  requested: boolean,
): boolean {
  return requested;
}

function clean(value: RawValue): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}
