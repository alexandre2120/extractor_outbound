# Integração — KIE (gateway multi-modelo de IA)

Camada de acesso a múltiplos modelos. Centraliza jobs e padroniza integração
assíncrona (webhook ou polling).

## Uso

- `AIEnrichment`: interpretar evidências + dados estruturados → JSON validado.
- Geração de mensagens: cold emails a partir de plano + evidências.

## Padrão

- Prompts versionados em `packages/prompts`.
- Saída SEMPRE validada por schema (`@repo/schemas`) antes de persistir.
- Job assíncrono via fila `enrichment` / `outbound` (BullMQ).

## Endpoint (importante)

A KIE expõe um endpoint **OpenAI-compatível com o modelo no PATH**:

```
POST {KIE_BASE_URL}/{model}/v1/chat/completions
# ex.: https://api.kie.ai/gemini-2.5-flash/v1/chat/completions
Authorization: Bearer {KIE_API_KEY}
body: { "messages": [...], "stream": false }   # "model" no body é opcional
```

Resposta no formato `chat.completion` padrão (inclui `credits_consumed`).
Há também endpoints específicos por família (ex.: GPT/Codex usam
`/codex/v1/responses`) — usar o do modelo configurado.

## Variáveis

`KIE_API_KEY`, `KIE_BASE_URL`, `KIE_DEFAULT_MODEL` (validado: `gemini-2.5-flash`).

## Controle de custo

- Sem enrichment automático da base inteira.
- Trigger manual por empresa ou lote pequeno.
- Cache por `inputHash`; versionamento em `AIEnrichment.version`.
