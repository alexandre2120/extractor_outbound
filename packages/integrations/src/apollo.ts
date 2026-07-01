/**
 * Apollo — enriquecimento de organização por domínio (funciona no plano free).
 * search e people/match exigem plano pago (não usados aqui).
 */

export interface ApolloOrg {
  name?: string;
  domain?: string;
  employees?: number;
  city?: string;
  country?: string;
  industry?: string;
  linkedinUrl?: string;
}

export class ApolloClient {
  constructor(private apiKey: string) {}

  /** Enriquece uma empresa a partir do domínio. Retorna null se não achar. */
  async enrichOrganization(domain: string): Promise<ApolloOrg | null> {
    const clean = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
    const res = await fetch(
      `https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(clean)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": this.apiKey,
        },
      },
    );
    if (!res.ok) return null;
    const d = (await res.json()) as Record<string, any>;
    const o = d.organization;
    if (!o) return null;
    return {
      name: o.name,
      domain: o.primary_domain,
      employees: o.estimated_num_employees,
      city: o.city,
      country: o.country,
      industry: o.industry,
      linkedinUrl: o.linkedin_url,
    };
  }
}
