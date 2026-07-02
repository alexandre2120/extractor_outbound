import { runResearchPlaywright } from "./research-playwright";

export type BrandingResearchOutput = {
  websiteUrl: string;
  evidence: string;
  pagesVisited: string[];
  logoCandidates: string[];
  colorCandidates: string[];
  engine: "playwright" | "fallback";
};

export async function researchBrandingWebsite(
  domain: string,
  opts: { timeoutMs?: number; maxPages?: number; headless?: boolean } = {},
): Promise<BrandingResearchOutput> {
  const origin = normalizeOrigin(domain);
  const researched = await runResearchPlaywright(domain, {
    maxPages: opts.maxPages ?? 5,
    timeoutMs: opts.timeoutMs ?? 30000,
    headless: opts.headless ?? true,
  });
  const homeHtml = await fetch(origin)
    .then((response) => (response.ok ? response.text() : ""))
    .catch(() => "");
  const title = extractTitle(homeHtml);
  const metaDescription = extractMetaDescription(homeHtml);

  const logoCandidates = Array.from(
    new Set(
      [
        ...extractLogoCandidates(origin, homeHtml),
        ...researched.evidence
          .flatMap((item) => extractHttpsUrls(item.extracted))
          .filter((url) => /logo|brand|marca/i.test(url)),
      ].slice(0, 8),
    ),
  );

  const colorCandidates = Array.from(
    new Set([
      ...extractHexColors(homeHtml),
      ...researched.evidence.flatMap((item) => extractHexColors(item.extracted)),
    ]),
  ).slice(0, 12);

  const evidence = [
    title ? `[title] ${title}` : null,
    metaDescription ? `[meta] ${metaDescription}` : null,
    researched.factualSummary,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    websiteUrl: origin,
    evidence,
    pagesVisited: researched.pagesVisited,
    logoCandidates,
    colorCandidates,
    engine: "playwright",
  };
}

function normalizeOrigin(input: string): string {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  return new URL(withProtocol).origin;
}

function extractHttpsUrls(text: string): string[] {
  return text.match(/https:\/\/[^\s"'<>)]*/g) ?? [];
}

function extractHexColors(text: string): string[] {
  return (text.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((color) =>
    color.toUpperCase(),
  );
}

function extractTitle(html: string): string | null {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
}

function extractMetaDescription(html: string): string | null {
  return (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1]?.trim() ??
    null
  );
}

function extractLogoCandidates(origin: string, html: string): string[] {
  const candidates = [
    ...Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi))
      .filter((match) => /logo|brand|marca/i.test(match[0]))
      .map((match) => match[1]),
    ...Array.from(html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi))
      .filter((match) => /icon|logo|apple-touch-icon/i.test(match[0]))
      .map((match) => match[1]),
  ];

  return candidates
    .map((candidate) => resolveHttpsUrl(origin, candidate))
    .filter((candidate): candidate is string => !!candidate);
}

function resolveHttpsUrl(origin: string, value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, origin);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
