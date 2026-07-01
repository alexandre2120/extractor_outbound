/**
 * Browser research com Playwright (Chromium headless). Renderiza JS, descobre
 * links internos relevantes, visita páginas-alvo e extrai texto renderizado.
 * Mantém a mesma saída de research.ts (ResearchOutput) para reuso nas actions.
 */
import type { ResearchOutput, ResearchEvidenceItem } from "./research";

// Classificação de página por sinais na URL/label.
const PAGE_TYPE_HINTS: Array<{ type: string; re: RegExp }> = [
  { type: "about", re: /about|sobre|quem-?somos|company|empresa/i },
  { type: "services", re: /services|servi[cç]os|solu[cç]|solutions|products?|produtos?/i },
  { type: "pricing", re: /pricing|pre[cç]os?|planos?|plans/i },
  { type: "industries", re: /industries|setores|mercados/i },
  { type: "cases", re: /cases?|clientes|customers|portfolio/i },
  { type: "contact", re: /contact|contato|fale-?conosco/i },
  { type: "careers", re: /careers|carreiras|vagas|trabalhe/i },
  { type: "blog", re: /blog|news|noticias|insights/i },
];

function classify(url: string, label: string): string | null {
  const hay = `${url} ${label}`;
  for (const h of PAGE_TYPE_HINTS) if (h.re.test(hay)) return h.type;
  return null;
}

function normalizeOrigin(input: string): string {
  let d = input.trim();
  if (!/^https?:\/\//i.test(d)) d = `https://${d}`;
  return new URL(d).origin;
}

export async function runResearchPlaywright(
  domain: string,
  opts: { timeoutMs?: number; maxPages?: number; headless?: boolean } = {},
): Promise<ResearchOutput> {
  const timeoutMs = opts.timeoutMs ?? 30000;
  const maxPages = opts.maxPages ?? 6;
  const headless = opts.headless ?? true;
  const origin = normalizeOrigin(domain);

  // Import dinâmico com webpackIgnore: impede o bundler do Next de empacotar o
  // playwright (e seus binários nativos); resolve como require() em runtime Node.
  const { chromium } = await import(/* webpackIgnore: true */ "playwright");

  const browser = await chromium.launch({ headless });
  const evidence: ResearchEvidenceItem[] = [];
  const pagesVisited: string[] = [];
  let domainValidated = false;

  try {
    const context = await browser.newContext({
      userAgent: "outbound-research/0.2 (+local; Playwright)",
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    // evaluate resiliente a navegações (sites com redirect client-side, como
    // muitos portais bancários, destroem o contexto de execução no meio).
    async function safeEval<T>(fn: () => T, fallback: T): Promise<T> {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await page.evaluate(fn);
        } catch (err) {
          if (/context was destroyed|navigation/i.test((err as Error).message)) {
            await page.waitForLoadState("domcontentloaded").catch(() => {});
            await page.waitForTimeout(700);
            continue;
          }
          throw err;
        }
      }
      return fallback;
    }

    async function gotoSettled(url: string) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      // espera a rede/redirect assentar sem falhar se estourar o tempo
      await page.waitForLoadState("load", { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(800);
    }

    // 1) Home — valida domínio e coleta links internos.
    await gotoSettled(origin);
    domainValidated = true;
    pagesVisited.push(origin);

    const homeText = await safeEval(() => document.body?.innerText ?? "", "");
    if (homeText.trim().length > 80) {
      evidence.push({ url: origin, pageType: "home", extracted: homeText.slice(0, 5000) });
    }

    const links = await safeEval(() => {
      const out: Array<{ href: string; text: string }> = [];
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        out.push({ href, text: (a.textContent ?? "").trim() });
      });
      return out;
    }, [] as Array<{ href: string; text: string }>).then((arr) =>
      arr.filter((l) => l.href.startsWith(origin)),
    );

    // 2) Seleciona uma página por tipo (dedup), priorizando tipos comerciais.
    const chosen = new Map<string, string>();
    for (const l of links) {
      const type = classify(l.href, l.text);
      if (type && !chosen.has(type)) chosen.set(type, l.href.split("#")[0]!);
    }

    for (const [pageType, url] of chosen) {
      if (evidence.length >= maxPages) break;
      if (pagesVisited.includes(url)) continue;
      try {
        await gotoSettled(url);
        pagesVisited.push(url);
        const text = await safeEval(() => document.body?.innerText ?? "", "");
        const clean = text.replace(/\s+/g, " ").trim();
        if (clean.length > 80) {
          evidence.push({ url, pageType, extracted: clean.slice(0, 5000) });
        }
      } catch {
        // página falhou — segue para a próxima
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  const factualSummary = evidence
    .map((e) => `[${e.pageType}] ${e.extracted.slice(0, 600)}`)
    .join("\n\n")
    .slice(0, 4000);

  const qualityScore = Math.min(
    100,
    (domainValidated ? 40 : 0) + evidence.length * 12,
  );

  return { domainValidated, pagesVisited, evidence, factualSummary, qualityScore };
}
