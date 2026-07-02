import { runResearchPlaywright } from "./research-playwright";
import type { ResearchOutput } from "./research";

export type BrandingResearchOutput = {
  websiteUrl: string;
  evidence: string;
  pagesVisited: string[];
  logoCandidates: string[];
  colorCandidates: string[];
  engine: "playwright" | "fallback";
};

export type BrandingResearchDeps = {
  fetch: typeof fetch;
  runResearchPlaywright: (
    domain: string,
    opts: { timeoutMs?: number; maxPages?: number; headless?: boolean },
  ) => Promise<ResearchOutput>;
};

export async function researchBrandingWebsite(
  domain: string,
  opts: { timeoutMs?: number; maxPages?: number; headless?: boolean } = {},
): Promise<BrandingResearchOutput> {
  return researchBrandingWebsiteWithDeps(domain, opts, {
    fetch: globalThis.fetch,
    runResearchPlaywright,
  });
}

export async function researchBrandingWebsiteWithDeps(
  domain: string,
  opts: { timeoutMs?: number; maxPages?: number; headless?: boolean } = {},
  deps: BrandingResearchDeps,
): Promise<BrandingResearchOutput> {
  const origin = normalizeOrigin(domain);
  const researchOpts = {
    maxPages: opts.maxPages ?? 5,
    timeoutMs: opts.timeoutMs ?? 30000,
    headless: opts.headless ?? true,
  };
  const homeHtml = await deps.fetch(origin)
    .then((response) => (response.ok ? response.text() : Promise.resolve("")))
    .catch(() => "");
  const homeSnapshot = summarizeHomeHtml(origin, homeHtml);

  try {
    const researched = await deps.runResearchPlaywright(domain, researchOpts);
    return {
      websiteUrl: origin,
      evidence: buildEvidence(homeSnapshot, researched.factualSummary),
      pagesVisited: researched.pagesVisited,
      logoCandidates: collectLogoCandidates(
        homeSnapshot.logoCandidates,
        researched.evidence
          .flatMap((item) => extractHttpsUrls(item.extracted))
          .filter((url) => /logo|brand|marca/i.test(url)),
      ),
      colorCandidates: collectColorCandidates(
        homeSnapshot.colorCandidates,
        researched.evidence.flatMap((item) => extractHexColors(item.extracted)),
      ),
      engine: "playwright",
    };
  } catch (error) {
    if (!homeHtml) throw error;

    return {
      websiteUrl: origin,
      evidence: buildEvidence(homeSnapshot),
      pagesVisited: [origin],
      logoCandidates: collectLogoCandidates(homeSnapshot.logoCandidates),
      colorCandidates: collectColorCandidates(homeSnapshot.colorCandidates),
      engine: "fallback",
    };
  }
}

type HomeHtmlSnapshot = {
  title: string | null;
  metaDescription: string | null;
  bodyExcerpt: string | null;
  logoCandidates: string[];
  colorCandidates: string[];
};

function summarizeHomeHtml(origin: string, html: string): HomeHtmlSnapshot {
  return {
    title: extractTitle(html),
    metaDescription: extractMetaDescription(html),
    bodyExcerpt: extractBodyExcerpt(html),
    logoCandidates: extractLogoCandidates(origin, html),
    colorCandidates: extractHexColors(html),
  };
}

function buildEvidence(
  homeSnapshot: HomeHtmlSnapshot,
  factualSummary?: string,
): string {
  return [
    homeSnapshot.title ? `[title] ${homeSnapshot.title}` : null,
    homeSnapshot.metaDescription ? `[meta] ${homeSnapshot.metaDescription}` : null,
    homeSnapshot.bodyExcerpt ? `[home] ${homeSnapshot.bodyExcerpt}` : null,
    factualSummary?.trim() ? factualSummary.trim() : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function collectLogoCandidates(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flat())).slice(0, 8);
}

function collectColorCandidates(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flat())).slice(0, 12);
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

function extractBodyExcerpt(html: string): string | null {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text.slice(0, 600) : null;
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
