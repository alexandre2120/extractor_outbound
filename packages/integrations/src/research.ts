/**
 * Browser research v1 — fetch + extração de texto. Coleta fatos públicos do
 * site com URL + timestamp. Upgrade documentado: Playwright (render JS, cliques).
 * Ver docs/integrations/browser-research.md
 */

export interface ResearchEvidenceItem {
  url: string;
  pageType: string;
  extracted: string;
}

export interface ResearchOutput {
  domainValidated: boolean;
  pagesVisited: string[];
  evidence: ResearchEvidenceItem[];
  factualSummary: string;
  qualityScore: number;
}

const CANDIDATE_PATHS: Record<string, string> = {
  home: "/",
  about: "/about",
  sobre: "/sobre",
  services: "/services",
  solucoes: "/solucoes",
  pricing: "/pricing",
  precos: "/precos",
  contact: "/contact",
  contato: "/contato",
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDomain(input: string): string {
  let d = input.trim();
  if (!/^https?:\/\//i.test(d)) d = `https://${d}`;
  return new URL(d).origin;
}

async function fetchPage(
  url: string,
  timeoutMs: number,
): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "outbound-research/0.1 (+local)" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function runResearch(
  domain: string,
  opts: { timeoutMs?: number; maxPages?: number } = {},
): Promise<ResearchOutput> {
  const timeoutMs = opts.timeoutMs ?? 30000;
  const maxPages = opts.maxPages ?? 5;
  const origin = normalizeDomain(domain);

  const evidence: ResearchEvidenceItem[] = [];
  const pagesVisited: string[] = [];
  let domainValidated = false;

  for (const [pageType, path] of Object.entries(CANDIDATE_PATHS)) {
    if (evidence.length >= maxPages) break;
    const url = `${origin}${path}`;
    const html = await fetchPage(url, timeoutMs);
    if (!html) continue;
    if (path === "/") domainValidated = true;
    pagesVisited.push(url);
    const text = htmlToText(html).slice(0, 4000);
    if (text.length > 80) {
      evidence.push({ url, pageType, extracted: text });
    }
  }

  const factualSummary = evidence
    .map((e) => `[${e.pageType}] ${e.extracted.slice(0, 500)}`)
    .join("\n\n")
    .slice(0, 3000);

  // Score simples: validação de domínio + volume de evidências.
  const qualityScore = Math.min(
    100,
    (domainValidated ? 40 : 0) + evidence.length * 15,
  );

  return {
    domainValidated,
    pagesVisited,
    evidence,
    factualSummary,
    qualityScore,
  };
}
