# Visão de arquitetura

## Stack

- **Web/back-end:** Next.js App Router (TypeScript).
- **Banco:** PostgreSQL (Docker local).
- **Cache/fila:** Redis (Docker local).
- **Workers:** Node/TS com BullMQ.
- **ORM:** Prisma.
- **E-mail/campanhas:** Brevo API.
- **IA multi-modelo:** KIE API.
- **Browser research:** navegador automatizado (Playwright na Camada 2).

## Monorepo

```
/apps/web        Next.js (UI + server actions/route handlers)
/apps/worker     jobs assíncronos (ingestão, research, enrichment, outbound)
/packages/ui     design system (componentes estilo shadcn/ui)
/packages/db     Prisma (schema, client, seed)
/packages/config env contract validado por zod
/packages/schemas contratos de I/O (zod)
/packages/prompts prompts versionados de IA
/packages/agents contratos de orquestração por microagentes
/docs            documentação obrigatória
/tracking        artefatos de status (JSON) + página HTML
```

## Fluxo central

`Plan` → filtros → `LeadList` → `Company` → `CompanyResearchJob` → `AIEnrichment` → `GeneratedMessage` → envio (Brevo) → `DeliveryEvent`.
