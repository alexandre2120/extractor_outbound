# Roadmap

## Camada 1 — estrutura inicial (em andamento)

- [x] Monorepo modular (pnpm + Turborepo).
- [x] Next.js App Router base.
- [x] Docker Compose: app, db, redis, worker (minio opcional).
- [x] Schema inicial do domínio (Prisma).
- [x] Design system mínimo (tokens neutros).
- [x] Documentação base.
- [x] Contratos de agentes.
- [x] Página HTML de acompanhamento.
- [x] Regras de bloqueio sem documentação.

## Camada 2 — funcional ponta a ponta

- [x] Onboarding + BusinessProfile (form + server action).
- [x] Plan Builder (criar; mercado BR). Editar segmentos/personas: pendente.
- [x] Ingestão de empresas por provider (CNPJá), testado via UI.
- [x] Persistência no microCRM (Company + RegistryData + LeadList).
- [x] CompanyResearchJob (fetch v1). Upgrade Playwright: pendente.
- [x] AIEnrichment manual (KIE, saída validada por schema).
- [x] Geração de mensagens (KIE).
- [x] Integração Brevo (envio + DeliveryEvent).
- [x] Tracking operacional/documental visível.

### Próximos (Camada 2.1)

- [ ] Editar Plan na UI (segmentos, personas, restrições).
- [x] Browser research com Playwright (render JS, descoberta de links).
- [x] Research/enrichment como jobs assíncronos no worker (BullMQ + UI polling).
- [ ] Sequências multi-step + webhook Brevo (open/click/reply).
- [ ] Mover ingestão/outbound também para a fila (lotes).
- [ ] Mover enrichment/outbound para a fila do worker (lotes aprovados).
