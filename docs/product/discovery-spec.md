# SPEC — Motor de Descoberta + Ranking (o que falta para a ferramenta ser funcional)

> **Status: P0 IMPLEMENTADO** (web-first, Apollo free). Testado em Portugal:
> plano "contabilistas" → 10 empresas, 9 com e-mail, ranqueadas pela IA
> (Census A·95, Audico A·85...). Fecha o gap entre "microCRM manual" e a proposta
> real: **dado um plano, encontrar empresas com e-mail exposto e ranqueá-las por IA.**

## 1. Objetivo (objetivo, sem rodeio)

O usuário define um **ICP** (segmento, porte, região). A ferramenta **descobre**
empresas que batem com esse perfil, **captura o e-mail público** de cada uma, e a
**IA ranqueia** a lista por aderência. O usuário revisa o topo do ranking e dispara
outbound (sequências via Brevo). Sem CNPJ obrigatório (Portugal é first-class).

**Loop:** `Plano → Descoberta multi-fonte → E-mail (provider + scraping) → Enrichment + Ranking IA → Revisão → Outbound → Eventos`

## 2. O que existe vs. o que falta

| Peça | Hoje | Falta |
| --- | --- | --- |
| Plano / ICP | ✅ editor de plano | corrigir país forçado (bug: hardcode Brasil) |
| Descoberta em lote | ❌ só 1 CNPJ manual | **motor de discovery multi-fonte** |
| E-mail exposto | ❌ | Apollo + scraping do site + validação |
| Ranking da lista | ❌ (enrichment 1-a-1) | **score + ranking** da rodada |
| microCRM / research / enrichment / sequências / Brevo | ✅ | reaproveitar |

## 3. Fontes de descoberta (estratégia multi-fonte)

> **Realidade do Apollo (testado):** a `APOLLO_KEY` está num **plano free**. No free,
> `search` (prospecção) e `people/match` (revelar e-mail) **NÃO** são acessíveis —
> só `organizations/enrich` (por domínio) funciona. Logo, **no free o Apollo não
> descobre empresas nem entrega e-mail**; serve só para **enriquecer** (porte,
> cidade, indústria) uma empresa já descoberta. Descoberta real fica com web/Maps.

Ordem: descobre por web/Maps/diretórios (grátis) → enriquece com Apollo (porte) →
e-mail por scraping.

| Fonte | Entrega | Papel (com Apollo free) | Status |
| --- | --- | --- | --- |
| **Busca web + IA** | empresa + site (query gerada do plano) | **descoberta primária** PT/BR | KIE + fetch/Playwright |
| **Google Maps / Places** | negócios locais (site, telefone, categoria) | **descoberta** de empresas locais PT | precisa `GOOGLE_PLACES_KEY` |
| **Diretórios setoriais PT** | listas de nicho (Racius, associações) | descoberta complementar (adapters) | por segmento |
| **CNPJá** (BR) | cadastro por CNAE/região | descoberta no Brasil | ✅ já integrado |
| **Apollo (enrich)** | porte, cidade, indústria por domínio | **enriquecimento** p/ ranking (não descobre) | ✅ free funciona |
| **Apollo (search+emails)** | empresa + contato + e-mail | descoberta+e-mail **direto** | ⚠️ exige **upgrade pago** |

Todas normalizam para `Company` + `ProviderSource`, com dedup por domínio/e-mail.

## 4. Pipeline de e-mail ("empresas com e-mail exposto")

Com Apollo free, o e-mail vem do **site** (Apollo não entrega e-mail sem upgrade):

1. **Scraping do site oficial** (Playwright já existe): rodapé, página de contato,
   `mailto:`, padrões `info@dominio`, `geral@dominio` (comum em PT).
2. *(se upgrade Apollo)* people-match entrega e-mail do decisor com cargo.
3. **Validação**: formato + MX do domínio + dedup. Marca `emailSource`
   (`website` | `apollo`) e `emailType` (`pessoal` | `genérico`).
4. Empresa sem e-mail → fica no CRM mas **fora do ranking de outbound**.

## 5. Ranking por IA (KIE)

Para cada empresa descoberta, a IA gera um **score 0–100** e um **tier (A/B/C)**,
priorizando (conforme decisão do produto):

- **Fit com o ICP** — segmento, porte e região vs. o plano (peso maior).
- **Qualidade do contato** — e-mail pessoal > genérico; presença do cargo decisor.

Saída estruturada (validada por schema): `{ score, tier, fitReasons[], contactQuality, redFlags[] }`.
O ranking ordena a `DiscoveryRun` do maior para o menor score. Custo controlado:
enrichment/ranking rodam **em lote pequeno aprovado**, no worker (fila).

## 6. Modelo de dados (adições)

- `DiscoveryRun` — execução de descoberta ligada a um `Plan` (fontes usadas,
  filtros, status, contadores). 1 rodada = N empresas.
- `DiscoveryResult` — join `DiscoveryRun`↔`Company` com `rankScore`, `tier`,
  `emailFound`, `emailSource`, `reasons`.
- `Company`: `+ emailSource, emailType` (o resto já existe).
- Reaproveita `AIEnrichment` para o racional do score.

## 7. Features priorizadas

**P0 — torna a ferramenta funcional (MVP do discovery, com Apollo free):**
- Corrigir plano: escolher mercado/país (desbloqueia Portugal).
- **Descoberta web + IA**: a partir do plano, gerar queries (segmento+região),
  buscar, visitar sites (Playwright) e extrair empresa + domínio.
- **Scraping de e-mail** no site + validação (formato/MX/dedup).
- **Apollo enrich** por domínio (porte/cidade/indústria) — sinal para o ranking.
- **DiscoveryRun**: botão "Descobrir empresas" no plano → lista de resultados.
- **Ranking IA** da rodada (fit ICP + qualidade do contato → score + tier).
- Tela de resultados: lista ranqueada, filtro "só com e-mail", "adicionar à lead list".

**P1 — cobertura e qualidade:**
- Busca web + IA e Google Maps como fontes adicionais.
- Dedup entre fontes; enriquecimento de porte/tecnologia (sinais).
- Exportar CSV da rodada.

**P2 — escala e insight:**
- Diretórios setoriais PT.
- Dashboard: taxa de e-mail encontrado, distribuição de tiers, conversão por fonte.
- Agendar rodadas recorrentes.

## 8. O que a ferramenta NÃO é (escopo / objetividade)

- Não é um scraper "de tudo" — descobre **dentro do ICP**, em lotes.
- Não garante e-mail de 100% das empresas (só das com e-mail exposto/no provider).
- IA **não** é fonte de verdade cadastral — só ranqueia e infere sobre evidência.
- Ações caras (Apollo pago, IA) são **em lote aprovado**, nunca sobre a base toda.
- Respeita robots/uso público no scraping; sem burlar login/paywall.

## 9. Custos e limites

- Apollo: custo por crédito/enriquecimento → lotes controlados, cache por domínio.
- KIE: ranking em lote pequeno; cache por `inputHash`.
- Scraping: rate limit e timeout (`BROWSER_RESEARCH_*`); serial no worker.

## 10. Ordem de implementação sugerida

1. Fix do país no plano (rápido, desbloqueia PT).
2. Descoberta **web + IA** (query do plano → sites → empresa+domínio) no worker.
3. `DiscoveryRun` + tela de resultados ligada ao plano.
4. Scraping de e-mail + validação; Apollo enrich por domínio (porte).
5. Ranking IA da rodada (fit ICP + qualidade do contato → score/tier).
6. Google Maps + diretórios + dedup entre fontes (P1).

### Decisão em aberto (afeta P0)

- **Manter Apollo free** → descoberta e e-mail via web/scraping; Apollo só enriquece porte. Custo zero de provider, mais engenharia de scraping.
- **Upgrade Apollo (pago)** → search + people-match entregam empresa **e** e-mail do decisor direto; scraping vira complemento. Mais rápido/rico, custo por lead.
