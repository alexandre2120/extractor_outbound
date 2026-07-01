# Serviços

| Serviço   | Imagem               | Porta | Papel                                   |
| --------- | -------------------- | ----- | --------------------------------------- |
| `app`     | build apps/web       | 3000  | Next.js (UI + API)                      |
| `db`      | postgres:16-alpine   | 5432  | banco principal                         |
| `redis`   | redis:7-alpine       | 6379  | fila (BullMQ) + cache                   |
| `worker`  | build apps/worker    | —     | jobs assíncronos                        |
| `minio`   | minio/minio (perfil) | 9000/9001 | snapshots/CSVs/anexos (opcional)    |

- Healthchecks em `db` e `redis`; `app`/`worker` dependem de ambos saudáveis.
- `minio` só sobe com `--profile storage`.
- Volumes nomeados: `db-data`, `redis-data`, `minio-data`.
