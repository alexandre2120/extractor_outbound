# Workflows

## 1. Onboarding → Plan

1. Cria `Workspace`.
2. Cria `BusinessProfile` (oferta, proposta de valor, tom).
3. Cria `Plan` com mercados/países/segmentos/personas/restrições.
4. (Opcional) refino por IA do `Plan` (`isAiRefined = true`).

## 2. Discovery

1. `Plan` gera filtros de busca.
2. Provider retorna empresas → `Company` + `CompanyRegistryData`.
3. Empresas entram em `LeadList`.

## 3. Browser research (worker)

1. Enfileira `research` para a `Company`.
2. Valida domínio, visita páginas-alvo, extrai fatos.
3. Persiste `ResearchEvidence` (URL+timestamp), `ResearchSnapshot`, `qualityScore`.

## 4. AI enrichment (manual / lote pequeno)

1. Usuário dispara `enrichment` para empresa(s) selecionada(s).
2. Worker monta prompt (registry + evidências), chama KIE.
3. Valida saída por schema (`aiEnrichmentOutput`), salva `AIEnrichment` (status GENERATED).
4. Revisão humana → APPROVED.

## 5. Outbound

1. `OutboundCampaign` + `SequenceStep`.
2. Gera `GeneratedMessage` (Plan + Company + AIEnrichment aprovado).
3. Revisão humana → APPROVED → envio via Brevo.
4. Registra `DeliveryEvent`.
