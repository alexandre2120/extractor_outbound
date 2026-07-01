# Runbook local

## Pré-requisitos

- Node 20+, pnpm 9, Docker + Docker Compose.

## Setup

```bash
cp .env.example .env.local      # preencher o que precisar
# Next/worker leem .env.local da PASTA do app — aponte o root para os apps:
ln -sf ../../.env.local apps/web/.env.local
ln -sf ../../.env.local apps/worker/.env.local
pnpm install
pnpm db:generate                # gera Prisma Client
docker compose up -d db redis   # sobe infra
pnpm db:push                    # cria schema (ou pnpm db:migrate)
pnpm db:seed                    # dados de demo
```

> Importante: o `pnpm dev` local lê `apps/web/.env.local` (não o root). Os
> symlinks acima mantêm uma única fonte de segredos. No Docker isso não se
> aplica — o compose injeta via `env_file` + `environment`.

## Desenvolvimento

```bash
pnpm dev                        # web (3000) + worker via turbo
# ou separadamente:
pnpm --filter @repo/web dev
pnpm --filter @repo/worker dev
```

## Tudo em containers

```bash
pnpm docker:up                  # app + worker + db + redis
pnpm docker:logs
pnpm docker:down
```

## Storage opcional (MinIO)

```bash
docker compose --profile storage up -d minio
```

## Tracking

Abrir `tracking/index.html` no navegador (lê os JSON de `tracking/`).
