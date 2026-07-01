/**
 * Extração de e-mail exposto no site oficial: visita home + páginas de contato,
 * coleta mailto e padrões de e-mail, valida e classifica pessoal vs genérico.
 */

export interface EmailResult {
  email: string | null;
  emailType: "pessoal" | "generico" | null;
  candidates: string[];
  pagesChecked: string[];
}

const CONTACT_PATHS = ["/", "/contacto", "/contactos", "/contact", "/contactos.html", "/contacto.html", "/sobre", "/about"];

const GENERIC_LOCALPARTS = [
  "info", "geral", "contact", "contacto", "contactos", "hello", "ola", "mail",
  "email", "comercial", "vendas", "suporte", "support", "admin", "office",
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// Extensões que aparecem coladas a e-mails falsos (imagens no rodapé).
const BAD_SUFFIX = /\.(png|jpg|jpeg|gif|webp|svg|css|js)$/i;

function classify(local: string): "pessoal" | "generico" {
  return GENERIC_LOCALPARTS.includes(local.toLowerCase()) ? "generico" : "pessoal";
}

function normalizeOrigin(input: string): string {
  let d = input.trim();
  if (!/^https?:\/\//i.test(d)) d = `https://${d}`;
  return new URL(d).origin;
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "outbound-discovery/0.1 (+local)" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function extractEmail(
  domain: string,
  opts: { timeoutMs?: number; maxPages?: number } = {},
): Promise<EmailResult> {
  const timeoutMs = opts.timeoutMs ?? 12000;
  const maxPages = opts.maxPages ?? 4;
  let origin: string;
  try {
    origin = normalizeOrigin(domain);
  } catch {
    return { email: null, emailType: null, candidates: [], pagesChecked: [] };
  }
  const host = new URL(origin).hostname.replace(/^www\./, "");

  const found = new Set<string>();
  const pagesChecked: string[] = [];

  for (const path of CONTACT_PATHS) {
    if (pagesChecked.length >= maxPages && found.size > 0) break;
    const html = await fetchText(`${origin}${path}`, timeoutMs);
    if (!html) continue;
    pagesChecked.push(`${origin}${path}`);
    const matches = html.match(EMAIL_RE) ?? [];
    for (const rawMatch of matches) {
      // Remove prefixos URL-encoded (%20, %2f...) que vazam antes do local-part.
      const e = rawMatch.toLowerCase().replace(/^(%[0-9a-f]{2})+/i, "");
      if (BAD_SUFFIX.test(e)) continue;
      if (!/^[a-z0-9._+-]+@/.test(e)) continue;
      if (e.includes("example.") || e.includes("sentry") || e.includes("wixpress")) continue;
      found.add(e);
    }
  }

  const candidates = [...found];
  // Prioriza e-mail no mesmo domínio do site.
  const sameDomain = candidates.filter((e) => e.endsWith(`@${host}`) || e.endsWith(`.${host}`));
  const pool = sameDomain.length > 0 ? sameDomain : candidates;

  // Prefere pessoal a genérico.
  const pessoal = pool.find((e) => classify(e.split("@")[0]!) === "pessoal");
  const best = pessoal ?? pool[0] ?? null;

  return {
    email: best,
    emailType: best ? classify(best.split("@")[0]!) : null,
    candidates,
    pagesChecked,
  };
}
