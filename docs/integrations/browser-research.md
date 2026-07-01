# Integração — Browser Research

A IA pesquisa informação **atual, real e verificável** abrindo o site oficial,
em vez de confiar no conhecimento paramétrico do modelo.

## Engine

- **Playwright (Chromium headless)** — engine padrão (`runResearchPlaywright`).
  Renderiza JS, descobre links internos, classifica páginas por tipo e extrai
  texto renderizado. Resiliente a navegações/redirect client-side (retry no
  `evaluate`).
- **Fetch v1** (`runResearch`) — fallback automático quando o Chromium não está
  instalado ou falha no launch.
- Entrada unificada: `researchCompany(domain)` → retorna `engine: "playwright" | "fetch"`.

### Setup do browser

```bash
pnpm --filter @repo/integrations exec playwright install chromium
```

`playwright` é dependência de `@repo/integrations` **e** de `@repo/web`
(necessário para resolução em runtime no servidor Next; pnpm isola por pacote).
No `next.config.ts` está em `serverExternalPackages` para não ser empacotado.
O import é dinâmico com `/* webpackIgnore: true */`.

## Páginas-alvo

home, about, services, solutions, pricing, industries, contact, careers, blog,
case studies, e páginas legais públicas quando úteis.

## Saídas

- domínio oficial validado;
- páginas visitadas;
- conteúdo relevante extraído;
- resumo factual do site;
- evidências associadas por URL + timestamp;
- snapshot pesquisável;
- score de qualidade da pesquisa.

## Persistência

- `CompanyResearchJob` (status, qualityScore).
- `ResearchEvidence` (url, pageType, extracted, capturedAt) — TruthLayer WEBSITE.
- `ResearchSnapshot` (storageKey no MinIO opcional, content textual).

## Política

- Apenas conteúdo público.
- Respeitar timeout (`BROWSER_RESEARCH_TIMEOUT_MS`) e modo headless.
