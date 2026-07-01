# Docker

Arquivo: `compose.yaml` (project name `outbound`).

## Serviços

- `db` (postgres:16) e `redis` (redis:7) com healthcheck e volume nomeado.
- `app` e `worker` buildados dos respectivos `Dockerfile`, dependem de db/redis saudáveis.
- `minio` sob perfil `storage`.

## Comandos

```bash
docker compose up -d db redis      # só infra (modo dev local)
docker compose up -d               # tudo
docker compose --profile storage up -d minio
docker compose logs -f worker
docker compose down                # mantém volumes
docker compose down -v             # apaga volumes (reset total)
```

## Variáveis

- `env_file: .env.local` em `app`/`worker`.
- `DATABASE_URL`/`REDIS_URL` injetadas com host interno (`db`, `redis`).
- Toda mudança aqui deve refletir no runbook e no env-contract.
