# Integração — CNPJ (Brasil)

Camada de verdade estruturada inicial para Brasil. Providers: **CNPJá** e **CNPJ.ws**.

## Objetivo

Consulta cadastral, filtros e enriquecimento básico por empresa (CNAE, situação, porte, capital).

## Contrato do adapter

```ts
interface CnpjProvider {
  lookup(taxId: string): Promise<RegistryResult>;
  search(filters: CnpjSearchFilters): Promise<RegistrySummary[]>;
}
```

- Saída mapeada para `CompanyRegistryData` (TruthLayer = REGISTRY).
- `raw` guarda o payload bruto do provider.

## Variáveis

`CNPJA_API_KEY`, `CNPJWS_API_KEY` (ver env-contract).

## Notas

- Respeitar rate limit e cachear consultas.
- Sem chave configurada, o módulo fica desabilitado (gating via `hasIntegration`).
