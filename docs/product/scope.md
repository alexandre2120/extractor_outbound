# Escopo

## Módulos funcionais

- Onboarding
- Plan Builder
- Lead Discovery
- Company Registry / microCRM
- Browser Research
- AI Enrichment
- Outbound Campaigns
- Documentation & Tracking

## Em escopo (Camada 1 + 2)

- Execução local via Docker Compose.
- Web Next.js (App Router) + worker Node/TS.
- Postgres + Redis locais.
- Adapters de provider (CNPJ BR; PT/EU via adapter).
- Browser research com evidências (URL + timestamp).
- AI enrichment manual com revisão humana.
- Geração e envio de mensagens via Brevo.

## Fora de escopo (inicial)

- Multi-tenant em produção / billing.
- Deploy gerenciado (foco é local na fase inicial).
- Enrichment automático de toda a base.
