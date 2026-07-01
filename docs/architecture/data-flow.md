# Fluxo de dados

```
Onboarding
   └─> BusinessProfile (oferta, proposta de valor, tom)
          └─> Plan (objetivo, mercados, países, segmentos, personas, restrições)
                 └─> filtros de busca
                        └─> LeadList ──> Company (microCRM)
                                            ├─ CompanyRegistryData  (REGISTRY — verdade estruturada)
                                            ├─ CompanyResearchJob   (WEBSITE — evidências + snapshot + score)
                                            └─ AIEnrichment         (AI — hipóteses, fitScore, ângulo)
                                                   └─> OutboundCampaign + SequenceStep
                                                          └─> GeneratedMessage ──(Brevo)──> DeliveryEvent
```

## Camadas de verdade (TruthLayer)

1. `REGISTRY` — providers cadastrais; base factual inicial.
2. `WEBSITE` — fatos públicos observados no site, com URL + timestamp.
3. `AI` — inferência derivada; **nunca** verdade primária; exige revisão humana antes do outbound.

## Gating de custo

- Ingestão e research podem rodar em lote.
- `enrichment` e `outbound` só por trigger manual / lote pequeno aprovado.
- Cache por `inputHash` evita reprocessar enrichment.
