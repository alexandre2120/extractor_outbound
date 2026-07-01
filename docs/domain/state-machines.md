# Máquinas de estado

## CompanyResearchJob (`JobStatus`)

```
PENDING ─> RUNNING ─> DONE
                  └─> FAILED
PENDING/RUNNING ─> CANCELLED
```

## AIEnrichment (`EnrichmentStatus`)

```
DRAFT ─> GENERATED ─> REVIEWED ─> APPROVED
                              └─> REJECTED
```

Regra: só `APPROVED` pode alimentar geração de mensagem para disparo.

## GeneratedMessage (`MessageStatus`)

```
DRAFT ─> REVIEWED ─> APPROVED ─> SCHEDULED ─> SENT
```

Regra: revisão humana obrigatória antes de `SCHEDULED`.

## OutboundCampaign (`CampaignStatus`)

```
DRAFT ─> ACTIVE ─> PAUSED ─> ACTIVE
              └─> COMPLETED
```

## AgentTask (`AgentTaskStatus`)

```
PENDING ─> IN_PROGRESS ─> DONE
PENDING ─> BLOCKED (falta documentação/contrato)
IN_PROGRESS ─> FAILED
```
