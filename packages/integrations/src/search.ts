/**
 * Busca web keyless (DuckDuckGo HTML) — bootstrap de descoberta sem API key.
 * Adapter plugável: Brave/Google Places entram depois com a mesma interface.
 */

export interface SearchHit {
  url: string;
  host: string;
  title: string;
}

// Agregadores/diretórios genéricos que não são "a empresa" em si.
const AGGREGATOR_DENYLIST = [
  "facebook.com", "instagram.com", "linkedin.com", "youtube.com", "twitter.com",
  "x.com", "tripadvisor", "misterwhat", "portalnacional", "cylex", "einforma",
  "racius", "guiaempresas", "pai.pt", "infoempresas", "wikipedia.org",
  "google.com", "maps.google", "yelp.", "indeed.", "glassdoor.",
  "infobel", "municipiosefreguesias", "cylex", "bizcognito", "kompass",
];

function isAggregator(host: string): boolean {
  return AGGREGATOR_DENYLIST.some((d) => host.includes(d));
}

export interface SearchProvider {
  name: string;
  search(query: string, opts?: { region?: string; limit?: number }): Promise<SearchHit[]>;
}

export const duckDuckGoProvider: SearchProvider = {
  name: "duckduckgo",
  async search(query, opts = {}) {
    const limit = opts.limit ?? 15;
    const region = opts.region ?? "pt-pt";
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${region}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept-Language": "pt-PT,pt;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);
    const html = await res.text();

    const hits: SearchHit[] = [];
    const seen = new Set<string>();
    // Links de resultado carregam o destino real no parâmetro uddg=.
    const re = /uddg=([^"&]+)[^>]*>(.*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      let target: string;
      try {
        target = decodeURIComponent(m[1]!);
      } catch {
        continue;
      }
      let host: string;
      try {
        host = new URL(target).hostname.replace(/^www\./, "");
      } catch {
        continue;
      }
      if (seen.has(host) || isAggregator(host)) continue;
      seen.add(host);
      const title = m[2]!.replace(/<[^>]+>/g, "").trim();
      hits.push({ url: target, host, title });
      if (hits.length >= limit) break;
    }
    return hits;
  },
};
