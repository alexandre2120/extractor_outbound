# Integração — Providers Portugal / Europa

Cobertura PT/EU tende a vir de serviços comerciais, registros e datasets menos
padronizados entre países. O sistema nasce com **adapters de provider** para
absorver essa heterogeneidade.

## Estratégia

- Mesmo contrato do adapter de CNPJ (`lookup` / `search`).
- Normalização para `Company` + `CompanyRegistryData` independente da fonte.
- `countryCode` define qual adapter usar.

## Status

- Camada 1: contrato definido, sem provider concreto.
- Camada 2+: integrar provider(s) PT/EU conforme disponibilidade comercial.

## A definir

- Provider(s) específicos por país.
- Mapeamento de identificadores (NIF/PT, etc.).
