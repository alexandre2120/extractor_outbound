# Troubleshooting

## `pnpm install` falha

- Confirme pnpm 9 (`corepack enable`) e Node 20+.

## Prisma: "Environment variable not found: DATABASE_URL"

- Crie `.env.local` a partir de `.env.example` e exporte/aponte `DATABASE_URL`.
- Rode `pnpm db:generate` após alterar o schema.

## App não conecta no banco em container

- Dentro do compose o host é `db` (não `localhost`). Veja `DATABASE_URL` no `compose.yaml`.

## Redis/worker

- `docker compose ps` deve mostrar `db`/`redis` healthy antes de `app`/`worker`.
- `docker compose logs -f worker` para ver os jobs.

## Reset total

```bash
docker compose down -v && docker compose up -d db redis && pnpm db:migrate && pnpm db:seed
```

## Porta ocupada

- Ajuste `APP_PORT` / `POSTGRES_PORT` / `REDIS_PORT` no `.env.local`.
