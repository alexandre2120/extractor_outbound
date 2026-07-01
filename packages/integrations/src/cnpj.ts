/**
 * Adapter CNPJá — verdade cadastral estruturada (Brasil).
 * Doc: https://cnpja.com/api  ·  GET /office/{taxId} (Authorization: <token>)
 */

export interface RegistryResult {
  taxId: string;
  name: string;
  legalName?: string;
  status?: string;
  cnae?: string;
  cnaeText?: string;
  foundedAt?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  raw: unknown;
}

const BASE = "https://api.cnpja.com";

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export class CnpjaProvider {
  constructor(private apiKey: string) {}

  async lookup(taxId: string): Promise<RegistryResult> {
    const cnpj = onlyDigits(taxId);
    const res = await fetch(`${BASE}/office/${cnpj}`, {
      headers: { Authorization: this.apiKey },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`CNPJá ${res.status}: ${body.slice(0, 200)}`);
    }
    const d = (await res.json()) as Record<string, any>;

    const mainActivity = d.mainActivity ?? {};
    const address = d.address ?? {};
    const phone = Array.isArray(d.phones) && d.phones[0]
      ? `${d.phones[0].area ?? ""}${d.phones[0].number ?? ""}`
      : undefined;
    const email = Array.isArray(d.emails) && d.emails[0]?.address
      ? d.emails[0].address
      : undefined;

    return {
      taxId: cnpj,
      name: d.alias || d.company?.name || d.name || cnpj,
      legalName: d.company?.name,
      status: d.status?.text,
      cnae: mainActivity.id ? String(mainActivity.id) : undefined,
      cnaeText: mainActivity.text,
      foundedAt: d.founded,
      email,
      phone: phone || undefined,
      city: address.city,
      state: address.state,
      raw: d,
    };
  }
}
