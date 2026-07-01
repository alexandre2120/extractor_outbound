# Jobs assíncronos

Worker: `apps/worker` (BullMQ sobre Redis).

## Filas

| Fila | Concorrência | Papel |
| --- | --- | --- |
| `ingestion` | 2 | ingestão de empresas por provider |
| `research` | 1 | browser research (pesado, serial) |
| `enrichment` | 1 | AI enrichment (gated, caro) |
| `outbound` | 2 | geração/envio de mensagens |

## Fluxo (produtor → consumidor)

1. A server action (web) cria o registro de status no banco:
   - `research` → `CompanyResearchJob` (status `PENDING`);
   - `enrichment` → `AIEnrichment` (status `DRAFT`).
2. A action enfileira o job (`apps/web/lib/queue.ts`) e retorna imediatamente.
3. O worker (`apps/worker/src/processors.ts`) consome, executa e atualiza o
   status: `RUNNING → DONE/FAILED` (research) e `DRAFT → GENERATED/REJECTED`
   (enrichment).
4. A UI (`AutoRefresh`) atualiza a página enquanto houver job ativo.

O worker lê `.env.local` via `--env-file-if-exists` (no Docker o env vem do
compose). Research usa Playwright; enrichment usa KIE (saída validada por schema).

## Regras

- `enrichment` e `outbound` nunca processam a base inteira automaticamente.
- Trigger manual ou lote pequeno aprovado pelo usuário.
- Graceful shutdown via SIGTERM/SIGINT (fecha workers e conexão).

## Status

Camada 2: `research` e `enrichment` implementados e testados ponta a ponta.
`ingestion` e `outbound` ainda como stub/síncrono (ingestão e envio rodam na
action; mover para fila é próximo passo se necessário).
