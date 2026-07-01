# Outbound MicroSaaS (plan-first)

Descoberta, enriquecimento e ativação de leads B2B orientada por **plano**
(`Plan` é o objeto pai). A base factual vem de fontes estruturadas; a IA entra
como camada complementar e controlada. Roda localmente via Docker.

**Regra de verdade:** `registry` (cadastral) > `website` (observado) > `ai` (inferido).

---

## 1. Stack

| Camada | Tecnologia |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| Web (UI + API) | Next.js 15 (App Router) + Tailwind + componentes estilo shadcn/ui |
| Banco | PostgreSQL (Docker) + Prisma |
| Fila / cache | Redis (Docker) + BullMQ |
| Worker | Node/TS (jobs: research, enrichment, ingestão, outbound) |
| Dados cadastrais | CNPJá (Brasil) |
| IA multi-modelo | KIE |
| E-mail / outbound | Brevo |
| Browser research | Playwright (Chromium) + fallback fetch |

---

## 2. Pré-requisitos

- **Node 20+** e **pnpm 9** (`corepack enable`)
- **Docker** + Docker Compose
- Chaves de API (opcionais — cada módulo se desabilita sozinho sem a chave):
  CNPJá, KIE, Brevo.

---

## 3. Setup (primeira vez)

```bash
# 1. variáveis de ambiente
cp .env.example .env.local          # preencha as chaves que tiver

# 2. o Next/worker leem .env.local da PASTA do app — aponte o root para os apps
ln -sf ../../.env.local apps/web/.env.local
ln -sf ../../.env.local apps/worker/.env.local

# 3. dependências + Prisma
pnpm install
pnpm db:generate

# 4. browser do Playwright (para o research)
pnpm --filter @repo/integrations exec playwright install chromium

# 5. infra + schema + dados de demo
docker compose up -d db redis
pnpm db:push
pnpm db:seed
```

### Onde colocar as chaves de API

No arquivo **`.env.local`** (na raiz). Ele está no `.gitignore` — nunca vai pro
Git. Preencha o que tiver:

```bash
CNPJA_API_KEY=...                    # https://cnpja.com
KIE_API_KEY=...                      # dashboard KIE
KIE_DEFAULT_MODEL=gemini-2.5-flash   # KIE embute o modelo no path da URL
BREVO_API_KEY=...                    # Brevo → SMTP & API → API Keys
BREVO_SENDER_EMAIL=voce@dominio.com  # precisa ser remetente verificado no Brevo
BREVO_SENDER_NAME=Seu Nome
```

Contrato completo em [docs/architecture/env-contract.md](docs/architecture/env-contract.md).

---

## 4. Rodar o projeto (dia a dia)

```bash
docker compose up -d db redis        # 1. infra (se não estiver de pé)
pnpm dev                             # 2. web + worker juntos (Turborepo)
```

- Web: **http://localhost:3000**
- O **worker precisa estar rodando** para research/enrichment (o `pnpm dev` já sobe ele).

Rodar separados, se preferir:

```bash
pnpm --filter @repo/web dev          # só o site (localhost:3000)
pnpm --filter @repo/worker dev       # só o worker
```

Tudo em containers:

```bash
pnpm docker:up                       # app + worker + db + redis
pnpm docker:logs
pnpm docker:down
```

### Comandos úteis

```bash
pnpm typecheck                       # checa tipos de todos os pacotes
pnpm db:studio                       # Prisma Studio (explorar o banco)
pnpm db:seed                         # recria dados de demo
docker compose --profile storage up -d minio   # MinIO opcional (snapshots)
```

### Acompanhamento do projeto

Painel de status em `tracking/index.html`:

```bash
cd tracking && python3 -m http.server 8080      # abre http://localhost:8080
```

---

## 5. Fluxo do produto (como usar)

1. **Plans** → crie o perfil da oferta + plano (objetivo, mercado).
2. **Companies** → ingira uma empresa por **CNPJ** (consulta a CNPJá).
3. Abra a empresa → defina o **domínio** → **Rodar research** (Playwright, async).
4. **Gerar enrichment** (KIE, async) → **Aprovar** o resultado.
5. **Gerar mensagem** → **Enviar** via Brevo (registra os eventos).

Research e enrichment rodam como **jobs no worker**; a página atualiza sozinha
enquanto o job está ativo.

---

## 6. Estrutura

```
apps/web            Next.js (UI + server actions)
apps/worker         jobs assíncronos (research, enrichment, ingestão, outbound)
packages/ui         design system (estilo shadcn/ui)
packages/db         Prisma (schema, client, seed)
packages/config     env contract (zod)
packages/schemas    contratos de I/O (zod)
packages/prompts    prompts de IA versionados
packages/integrations  clients CNPJá / KIE / Brevo / Playwright research
packages/agents     contratos de orquestração por microagentes
docs/               documentação obrigatória
tracking/           status (JSON) + página HTML
```

---

## 7. Troubleshooting

| Sintoma | Causa / solução |
| --- | --- |
| **UI sem estilo (CSS 404)** | `.next` corrompido (misturou `build` de produção com `dev`). Rode: `rm -rf apps/web/.next && pnpm --filter @repo/web dev` |
| `Environment variable not found: DATABASE_URL` | Faltam os symlinks do passo 3.2 do setup |
| Research/enrichment não completam | O worker não está rodando (`pnpm dev` ou `pnpm --filter @repo/worker dev`) |
| Research cai em `fetch` em vez de `playwright` | Rode `pnpm --filter @repo/integrations exec playwright install chromium` |
| Envio Brevo falha | O `BREVO_SENDER_EMAIL` precisa ser um remetente verificado no painel Brevo |
| Reset total do banco | `docker compose down -v && docker compose up -d db redis && pnpm db:push && pnpm db:seed` |

Mais detalhes em [docs/operations/troubleshooting.md](docs/operations/troubleshooting.md)
e [docs/operations/runbook-local.md](docs/operations/runbook-local.md).
