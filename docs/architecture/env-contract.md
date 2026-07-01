# Contrato de variáveis de ambiente

Toda variável nova **deve** ser adicionada em três lugares: `.env.example`,
`packages/config/src/index.ts` (validação zod) e nesta tabela.

| Variável | Obrigatória | Default | Descrição |
| --- | --- | --- | --- |
| `NODE_ENV` | não | development | ambiente |
| `APP_URL` | não | http://localhost:3000 | URL pública do app |
| `DATABASE_URL` | **sim** | — | conexão Postgres |
| `REDIS_URL` | não | redis://localhost:6379 | conexão Redis |
| `POSTGRES_USER/PASSWORD/DB/PORT` | sim (compose) | outbound | credenciais do `db` |
| `REDIS_PORT` | não | 6379 | porta do `redis` |
| `BREVO_API_KEY` | só p/ outbound | — | chave Brevo |
| `BREVO_SENDER_EMAIL` | só p/ outbound | — | remetente |
| `BREVO_SENDER_NAME` | não | — | nome do remetente |
| `KIE_API_KEY` | só p/ enrichment | — | chave KIE |
| `KIE_BASE_URL` | não | https://api.kie.ai | base URL KIE |
| `KIE_DEFAULT_MODEL` | não | — | modelo padrão |
| `CNPJA_API_KEY` | só p/ provider | — | CNPJá |
| `CNPJWS_API_KEY` | só p/ provider | — | CNPJ.ws |
| `BROWSER_RESEARCH_HEADLESS` | não | true | headless do navegador |
| `BROWSER_RESEARCH_TIMEOUT_MS` | não | 30000 | timeout de research |
| `MINIO_*` | só c/ perfil storage | — | credenciais MinIO |

## Regras

- Nenhum segredo real em documentação ou no repositório.
- Arquivos: `.env.example` (versionado), `.env.local` (ignorado), `.env.ai`/`.env.db` opcionais por serviço.
- Precedência no Compose: `environment` > shell > `env_file`.
