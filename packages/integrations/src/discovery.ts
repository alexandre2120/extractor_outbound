/**
 * Orquestrador de descoberta: query → busca web → por candidato extrai e-mail
 * e enriquece porte (Apollo). O ranking por IA é aplicado depois, no worker.
 */
import { duckDuckGoProvider, type SearchHit } from "./search";
import { extractEmail } from "./email-extract";
import { ApolloClient, type ApolloOrg } from "./apollo";

export interface DiscoveredCompany {
  name: string;
  domain: string;
  url: string;
  email: string | null;
  emailType: "pessoal" | "generico" | null;
  apollo: ApolloOrg | null;
}

export interface DiscoveryOptions {
  region?: string; // ex: pt-pt
  limit?: number; // nº de empresas alvo
  apolloKey?: string | null;
  timeoutMs?: number;
}

/** Monta a query de busca a partir do segmento e da região do plano. */
export function buildDiscoveryQuery(segment: string, locationLabel: string): string {
  return `${segment} ${locationLabel} contacto email`.trim();
}

export async function runDiscovery(
  query: string,
  opts: DiscoveryOptions = {},
): Promise<{ query: string; hits: SearchHit[]; companies: DiscoveredCompany[] }> {
  const limit = opts.limit ?? 15;
  const apollo = opts.apolloKey ? new ApolloClient(opts.apolloKey) : null;

  const hits = await duckDuckGoProvider.search(query, { region: opts.region, limit });

  const companies: DiscoveredCompany[] = [];
  for (const hit of hits) {
    const emailRes = await extractEmail(hit.host, { timeoutMs: opts.timeoutMs });
    let apolloOrg: ApolloOrg | null = null;
    if (apollo) {
      try {
        apolloOrg = await apollo.enrichOrganization(hit.host);
      } catch {
        apolloOrg = null;
      }
    }
    companies.push({
      name: apolloOrg?.name || hit.title || hit.host,
      domain: hit.host,
      url: hit.url,
      email: emailRes.email,
      emailType: emailRes.emailType,
      apollo: apolloOrg,
    });
  }

  return { query, hits, companies };
}
