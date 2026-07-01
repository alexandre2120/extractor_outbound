# Entidades

Fonte da verdade: `packages/db/prisma/schema.prisma`.

## Workspace & oferta

- **Workspace** — contexto da empresa usuária.
- **BusinessProfile** — oferta, proposta de valor, posicionamento, tom, objetivo.

## Plan (objeto pai)

- **Plan** — objetivo comercial; pode ser refinado por IA (`isAiRefined`).
- **PlanMarket** — mercados (BRAZIL, PORTUGAL, EUROPE).
- **PlanCountry** — países (ISO alpha-2).
- **PlanSegment** — segmentos (CNAEs, keywords).
- **PlanPersona** — personas-alvo (role, seniority).
- **PlanConstraint** — restrições (incluir/excluir, min/max).

## Discovery & microCRM

- **LeadList** / **LeadListMember** — listas e seus membros.
- **Company** — empresa no microCRM (`@@unique([workspaceId, taxId])`).
- **CompanyRegistryData** — verdade estruturada (TruthLayer REGISTRY).
- **CompanyWebsite** — domínio oficial + resumo factual.

## Research

- **CompanyResearchJob** — job de browser (status, qualityScore).
- **ResearchEvidence** — evidência com URL + timestamp (TruthLayer WEBSITE).
- **ResearchSnapshot** — snapshot pesquisável.

## IA & outbound

- **AIEnrichment** — inferência (TruthLayer AI; status, version, fitScore, inputHash).
- **OutboundCampaign** / **SequenceStep** — campanha e passos.
- **GeneratedMessage** — mensagem gerada (status, version).
- **DeliveryEvent** — eventos (sent, opened, bounced, replied...).

## Providers, orquestração, docs

- **ProviderSource** — registro de providers.
- **AgentTask** — tarefas de microagentes (status, dependsOn, blocks).
- **ProjectCheckpoint** — marcos.
- **DocumentationArtifact** — rastreio de docs existentes/obrigatórias.
