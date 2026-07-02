# Mudanças Implementadas — UI Plan-First e Fluxo de Campanhas

Data: 2026-07-02  
Branch: `codex/continue-plan-first-design`

## Resumo

Esta rodada transformou a interface em um fluxo guiado de outbound plan-first:

1. Criar ou editar o plano/ICP.
2. Descobrir empresas.
3. Ranqueá-las e selecionar/refinar as melhores.
4. Levar empresas selecionadas para campanhas sem perder a seleção.
5. Preparar empresas selecionadas com research, enrichment e aprovação.
6. Gerar sequência de mensagens apenas para empresas prontas.
7. Revisar a mensagem completa antes do envio.
8. Enviar via Brevo com HTML transacional e fallback texto.
9. Acompanhar status e eventos.

Também foram adicionados testes unitários para regras de fluxo, ranking, seleção de empresas, formulários e hidratação.

## Escopo

### Incluído

- Nova UI compartilhada para jornada guiada.
- Dashboard plan-first.
- Página de plano com stepper, ICP, descoberta, ranking, refino, segmentos, personas e restrições.
- Tabela de ranking com seleção em lote.
- Persistência da seleção de empresas via query params ao navegar para campanhas.
- Criação de campanha preservando empresas selecionadas.
- Tela de detalhe da campanha com preparação das empresas selecionadas.
- Geração de sequência para múltiplas empresas aprovadas.
- Preview completo de mensagens, com texto puro e HTML final do Brevo.
- Template HTML reutilizável para emails de outbound.
- Envio via Brevo usando `htmlContent` e `textContent`.
- Campos longos trocados de `Input` para `Textarea`.
- Correção de warning de hidratação causado por atributo injetado por extensão no `<body>`.
- Script de teste para `apps/web`.
- Plano de implementação para a preparação de empresas selecionadas em `docs/superpowers/plans`.

### Não incluído

- Não foi criada tabela persistente de membros de campanha.
- A seleção de empresas ainda é preservada por URL/query params.
- O campo `BusinessProfile.offer` continua salvo, mas o prompt final de mensagem usa principalmente dados do `Plan`: `objective`, `valueProp` e `tone`.
- Não foi criada uma seção completa de “Material de marketing” com cases, objeções, diferenciais e CTA.
- Não foi criado editor visual/manual de template; o HTML é gerado por helper centralizado.

## Arquivos Criados

### Componentes

- `apps/web/components/flow-ui.tsx`
  - Componentes reutilizáveis para a jornada:
    - `StageStepper`
    - `PageHeader`
    - `SectionCard`
    - `SectionTitle`
    - `StatusPill`
    - `TierBadge`
    - `ScoreBar`
    - `AsyncNotice`
    - `EmptyState`
    - `KpiCard`

- `apps/web/components/plan-ranking-table.tsx`
  - Tabela client-side do ranking.
  - Filtros por e-mail e tier.
  - Seleção individual e seleção de empresas visíveis.
  - Barra fixa de ações para empresas selecionadas.
  - Ações:
    - `Adicionar à campanha`
    - `Refinar selecionadas`
    - `Refinar melhores`

- `apps/web/components/message-preview-card.tsx`
  - Card compartilhado para revisar mensagens antes do envio.
  - Mostra:
    - assunto
    - empresa
    - campanha
    - passo
    - status
    - eventos
    - ação de envio
  - Expõe duas visões da mesma mensagem:
    - texto puro completo
    - preview HTML em `iframe` usando `srcDoc`

### Helpers

- `apps/web/lib/flow.ts`
  - Define as etapas do fluxo:
    - `icp`
    - `discovery`
    - `refinement`
    - `campaign`
    - `send`
  - Calcula a próxima ação para:
    - Plano: `getPlanPrimaryAction`
    - Empresa: `getCompanyPrimaryAction`
    - Campanha: `getCampaignPrimaryAction`
  - Expõe `getStageIndex` para o stepper.

- `apps/web/lib/ranking.ts`
  - `getVisibleRankingRows`
    - Aplica filtros de e-mail e tier.
    - Ordena por score.
  - `getDefaultRefinementSelection`
    - Pré-seleciona empresas tier `A`/`B` com e-mail.

- `apps/web/lib/campaign-selection.ts`
  - `buildCampaignSelectionHref`
    - Monta URLs com `companyId` repetido e `planId`.
  - `getSelectedCompanyIds`
    - Lê empresas selecionadas da query string.
  - `getSelectedPlanId`
    - Lê o plano selecionado da query string.

- `apps/web/lib/selected-companies.ts`
  - Classifica empresas selecionadas conforme prontidão:
    - `ready`
    - `needsApproval`
    - `needsEnrichment`
    - `needsResearch`
    - `blocked`
  - `getSelectedCompanyPrepIds`
    - Retorna IDs que podem avançar em lote:
      - `approveIds`
      - `enrichIds`
      - `researchIds`

- `apps/web/lib/email-template.ts`
  - `renderOutboundEmailHtml`
    - Gera o HTML final usado no Brevo.
    - Usa estrutura compatível com email: `doctype`, `html`, `head`, `body`, `preheader`, tabelas de apresentação e CSS inline.
    - Escapa conteúdo gerado por IA antes de inserir no HTML.
    - Preserva parágrafos e quebras de linha do texto.
  - `renderOutboundEmailText`
    - Normaliza o fallback de texto puro enviado como `textContent`.

### Testes

- `apps/web/lib/flow.test.ts`
  - Cobre próxima ação do plano, empresa e etapas do stepper.

- `apps/web/lib/ranking.test.ts`
  - Cobre filtros do ranking e seleção padrão para refino.

- `apps/web/lib/campaign-selection.test.ts`
  - Cobre preservação de empresas selecionadas em links de campanha.

- `apps/web/lib/selected-companies.test.ts`
  - Cobre classificação das empresas selecionadas e IDs para preparação em lote.

- `apps/web/lib/layout-source.test.ts`
  - Garante `suppressHydrationWarning` no `<body>`.

- `apps/web/lib/plan-form-source.test.ts`
  - Garante uso de `Textarea` nos campos longos de plano, ICP e objetivo do passo da campanha.

- `apps/web/lib/email-template.test.ts`
  - Garante que o HTML do Brevo é completo, escapa conteúdo e preserva quebras de linha.
  - Garante fallback de texto puro legível.

- `apps/web/lib/message-preview-source.test.ts`
  - Garante que empresa e campanha usam o preview compartilhado de mensagem.
  - Evita regressão para mensagens truncadas com `line-clamp`.

### Documentação de plano de execução

- `docs/superpowers/plans/2026-07-01-campaign-selected-company-prep.md`
  - Plano de implementação da preparação de empresas selecionadas na campanha.

## Arquivos Alterados

### `apps/web/package.json`

Adicionado script:

```json
"test": "node --import tsx --test \"lib/**/*.test.ts\""
```

Uso:

```bash
corepack pnpm --filter @repo/web test
```

### `apps/web/app/layout.tsx`

Mudanças:

- Navegação renomeada para português:
  - Painel
  - Planos
  - Empresas
  - Campanhas
- Marca visual simples: `Cadência`.
- Layout centralizado com `max-w-6xl`.
- Adicionado `suppressHydrationWarning` no `<body>`.

Motivo do `suppressHydrationWarning`:

- O navegador/uma extensão estava injetando atributo como `cz-shortcut-listen="true"` no `<body>`, causando warning de hidratação no Next/React.

### `apps/web/app/page.tsx`

Mudanças:

- Página inicial virou um painel operacional plan-first.
- Mostra:
  - Stepper da etapa atual.
  - Próxima ação do plano.
  - KPIs:
    - Descobertas
    - Com e-mail
    - Aprovadas
    - Campanhas
    - Enviadas
  - Barra visual de pipeline.
- Se não existir plano, mostra empty state com CTA para criar plano.

### `apps/web/app/plans/page.tsx`

Mudanças:

- Formulário de criação de plano mantém:
  - Nome do plano
  - País-alvo
  - O que você vende
  - Proposta de valor
  - Objetivo comercial
  - Tom de comunicação
- Campos longos agora usam `Textarea`:
  - `offer`
  - `valueProp`
  - `objective`
- Lista de planos existentes mantida.

### `apps/web/app/plans/[id]/page.tsx`

Mudanças:

- Página de plano reestruturada como fluxo guiado:
  - Stepper.
  - Header com próxima ação.
  - Seção `ICP · Perfil de cliente ideal`.
  - Seção de descoberta.
  - Ranking com tabela interativa.
  - Restrições.
- Campos longos agora usam `Textarea`:
  - `objective`
  - `valueProp`
  - `painPoints`
  - valor de restrição (`value`)
- Ações principais:
  - Completar ICP.
  - Descobrir empresas.
  - Refinar melhores.
- Usa `PlanRankingTable`.
- Usa `getDefaultRefinementSelection` para selecionar automaticamente empresas boas para refino.

### `apps/web/app/companies/[id]/page.tsx`

Mudanças:

- Página da empresa foi reorganizada como uma jornada de verdade/qualificação:
  - Stepper.
  - Header com score/tier/e-mail.
  - Auto refresh durante jobs assíncronos.
  - Camadas de verdade:
    - Registro
    - Website
    - IA
  - Enrichments.
  - Mensagens.
- A lista de mensagens agora usa `MessagePreviewCard`.
- O corpo não é mais truncado por `line-clamp`.
- Cada mensagem mostra:
  - texto puro completo
  - preview do HTML que será enviado pelo Brevo
  - status/eventos
  - botão `Enviar` quando ainda está em rascunho
- A ação primária muda conforme o estado:
  - Pesquisar site.
  - Enriquecer (IA).
  - Aprovar.
  - Adicionar à campanha.
  - Ver na campanha.

### `apps/web/app/campaigns/page.tsx`

Mudanças:

- A página de campanhas agora lê query params:
  - `companyId`
  - `planId`
- Mostra empresas selecionadas vindas do ranking.
- Ao criar campanha, inclui `companyId` e `planId` como campos hidden.
- Links para campanhas existentes preservam a seleção atual.

Fluxo corrigido:

1. Usuário seleciona empresas no ranking.
2. Clica em `Adicionar à campanha`.
3. Vai para `/campaigns?companyId=...&planId=...`.
4. Cria ou abre uma campanha.
5. As empresas selecionadas continuam disponíveis na campanha.

### `apps/web/app/campaigns/[id]/page.tsx`

Mudanças:

- Página de campanha reestruturada como fluxo guiado:
  - Stepper.
  - Header da campanha.
  - Status e ação de ativar/pausar.
  - Seção de passos da sequência.
  - Seção de empresas selecionadas do ranking.
  - Seção de geração de sequência.
  - Seção de mensagens por empresa.
- Campo `Objetivo do passo` agora usa `Textarea`.
- Empresas selecionadas são classificadas como:
  - pronta
  - aguarda aprovação
  - precisa enrichment
  - precisa research
  - em andamento ou sem domínio
- Adicionado CTA em lote:
  - `Preparar selecionadas`
- Ações individuais por empresa:
  - `Aprovar`
  - `Enriquecer`
  - `Pesquisar site`
- Empresas prontas aparecem marcadas na área `Gerar sequência`.
- A geração de sequência suporta múltiplas empresas.
- A seção `Mensagens por empresa` deixou de ser uma tabela truncada.
- Cada mensagem usa `MessagePreviewCard`, com texto completo e preview HTML do Brevo.

## Server Actions Alteradas ou Adicionadas

Arquivo: `apps/web/lib/actions.ts`

### `createBusinessProfileAndPlan`

Cria:

- `BusinessProfile`
- `Plan`
- país/mercado inicial

Campos principais:

- `offer`
- `valueProp`
- `objective`
- `tone`

### `updatePlanAction`

Atualiza:

- nome
- objetivo comercial
- proposta de valor
- tom

Esses dados alimentam prompts de enrichment e mensagem.

### `createCampaignAction`

Mudanças:

- Lê `companyId` de `FormData.getAll("companyId")`.
- Lê `planId`.
- Cria a campanha vinculada ao plano selecionado quando válido.
- Quando há empresas selecionadas, redireciona para:

```txt
/campaigns/:id?companyId=...&planId=...
```

### `prepareSelectedCompaniesAction`

Nova action.

Responsabilidade:

- Recebe empresas selecionadas na campanha.
- Valida workspace da campanha.
- Classifica próximas ações.
- Aprova enrichments `GENERATED` ou `REVIEWED`.
- Enfileira enrichment quando a empresa já tem fatos de website.
- Enfileira research quando falta website mas existe domínio ou e-mail.
- Ignora empresas bloqueadas ou sem ação possível.

Retorno:

- Mensagem resumida com contagens:
  - aprovadas
  - enrichment
  - research
  - sem ação agora

### `generateSequenceForCompanyAction`

Mudanças:

- Antes recebia uma empresa.
- Agora lê múltiplos `companyId`.
- Para cada empresa com enrichment `APPROVED`, gera uma mensagem por passo da sequência.
- Pula empresas sem enrichment aprovado.
- Restringe empresas ao workspace da campanha.

### `sendMessageAction`

Mudanças:

- Antes enviava apenas `text`.
- Agora renderiza a mensagem com:
  - `renderOutboundEmailText`
  - `renderOutboundEmailHtml`
- Envia para o Brevo:
  - `textContent`
  - `htmlContent`
- Revalida a página da empresa.
- Revalida a página da campanha quando a mensagem pertence a uma campanha.

### `refineCompaniesAction`

Nova/expandida para refino em lote.

Responsabilidade:

- Recebe empresas selecionadas no ranking.
- Enfileira research quando ainda não há fatos de website.
- Enfileira enrichment quando já há website e ainda não há enrichment utilizável.
- Evita duplicar jobs ativos.

## Fluxos Corrigidos

### Seleção do ranking para campanha

Problema original:

- A seleção existia só em estado client-side no ranking.
- O botão `Adicionar à campanha` apontava para `/campaigns` sem carregar os IDs.
- Ao criar campanha, as empresas não apareciam selecionadas.

Correção:

- `PlanRankingTable` usa `buildCampaignSelectionHref`.
- A URL carrega `companyId` e `planId`.
- `/campaigns` lê a seleção.
- `createCampaignAction` redireciona para a campanha criada preservando a seleção.

### Empresas selecionadas mas não prontas

Problema observado:

- As empresas chegavam na campanha, mas apareciam como `0 prontas`.
- A UI não explicava o que fazer.

Correção:

- `selected-companies.ts` classifica o próximo passo de cada empresa.
- UI mostra status operacional por empresa.
- Adicionado botão `Preparar selecionadas`.
- Ações diretas permitem aprovar, enriquecer ou pesquisar site.

### Formulários de material comercial

Problema:

- Campos narrativos usavam `Input`, ruins para textos maiores.

Correção:

- Campos narrativos usam `Textarea`:
  - oferta
  - proposta de valor
  - objetivo comercial
  - dores
  - restrições longas
  - objetivo do passo da sequência

### Revisão da mensagem antes do envio

Problema:

- A UI mostrava apenas assunto ou um trecho truncado da mensagem.
- Não dava para revisar exatamente o texto que seria enviado.
- O envio via Brevo não tinha uma estrutura HTML definida.

Correção:

- Criado `MessagePreviewCard` para empresa e campanha.
- O preview mostra:
  - texto puro completo
  - HTML final renderizado em `iframe`
- Criado `email-template.ts` como fonte única para:
  - preview HTML na UI
  - `htmlContent` enviado ao Brevo
  - fallback `textContent`

## Fluxo de Dados para Mensagens de Outbound

A mensagem final é gerada em:

- `apps/web/lib/actions.ts`
  - `generateMessageAction`
  - `generateSequenceForCompanyAction`

O HTML final enviado ao Brevo é gerado em:

- `apps/web/lib/email-template.ts`
  - `renderOutboundEmailHtml`
  - `renderOutboundEmailText`

O mesmo helper é usado por:

- `apps/web/components/message-preview-card.tsx`
  - preview visual na UI
- `apps/web/lib/actions.ts`
  - envio real via `sendMessageAction`

O prompt final é construído em:

- `packages/prompts/src/index.ts`
  - `buildMessagePrompt`

Entradas usadas hoje:

- `planObjective`
  - vem de `Plan.objective`
- `valueProp`
  - vem de `Plan.valueProp`
- `tone`
  - vem de `Plan.tone`
- `companyName`
  - vem da empresa alvo
- `approachAngle`
  - vem do enrichment aprovado
  - no caso de campanha, inclui também o objetivo do passo
- `factualSummary`
  - vem da pesquisa do site da empresa alvo

Observação:

- `BusinessProfile.offer` é salvo no onboarding, mas ainda não entra diretamente no prompt final de mensagem.
- Para melhorar a qualidade de copy, o próximo passo recomendado é criar uma seção persistida de `Material de marketing`.

## Estrutura do HTML enviado no Brevo

Arquivo: `apps/web/lib/email-template.ts`

Estrutura:

1. `<!doctype html>` e `<html lang="pt-BR">`.
2. `<head>` com charset, viewport, compatibilidade e `<title>` com o assunto escapado.
3. `<body data-template="outbound-email">` com fundo claro.
4. Preheader invisível baseado nos primeiros caracteres do corpo.
5. Tabela externa `role="presentation"` para compatibilidade com clientes de email.
6. Container central de até `600px`, fundo branco, borda leve e raio discreto.
7. Corpo renderizado em parágrafos com CSS inline.
8. Quebras simples dentro do mesmo parágrafo viram `<br />`.
9. Conteúdo de IA/usuário é escapado antes de entrar no HTML.

Decisão:

- O template é deliberadamente leve, sem imagens, scripts ou CSS externo.
- A campanha e o passo aparecem na interface, mas não são inseridos no corpo do email enviado ao lead.
- O mesmo conteúdo também é enviado como texto puro para melhorar compatibilidade e entregabilidade.

## Testes e Verificações

Comandos usados durante a implementação:

```bash
corepack pnpm --filter @repo/web test
corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false
corepack pnpm --filter @repo/web build
```

Verificações manuais/automatizadas:

- Playwright validou seleção ranking → campanhas.
- Playwright validou campanha criada com empresas selecionadas.
- Playwright validou CTA `Preparar selecionadas`.
- Playwright validou presença de `textarea` em:
  - `/plans`
  - `/plans/[id]`
  - `/campaigns/[id]`
- Testes unitários validaram o template HTML/texto do Brevo.
- Testes source-based validaram que a UI usa o preview compartilhado de mensagens.

## Estado Local de Execução

Durante os testes, o app foi reiniciado em:

```txt
http://localhost:3000
```

O worker continuou processando filas de:

- research
- enrichment
- discovery
- outbound

## Decisões Técnicas

### Sem tabela de associação campanha/empresa

Foi mantido o modelo atual:

- Empresas selecionadas são carregadas na URL.
- Mensagens geradas persistem a associação real via `GeneratedMessage`.

Motivo:

- Evita mudança de schema antes de validar o fluxo.
- Mantém o escopo menor.

Trade-off:

- Ao perder a URL com query params, a seleção visual também se perde.
- Futuro recomendado: criar uma tabela `CampaignLead` ou equivalente.

### Preparação em lote reaproveita pipeline existente

`prepareSelectedCompaniesAction` não cria pipeline novo.

Ela reutiliza:

- `researchQueue`
- `enrichmentQueue`
- `approveEnrichmentAction`/mesma lógica de aprovação

Motivo:

- Evita duplicar regras.
- Mantém worker como executor dos processos pesados.

### Campos longos como `Textarea`

Campos que alimentam marketing e prompt precisam receber texto com contexto.

Por isso foram convertidos:

- oferta
- proposta de valor
- objetivo comercial
- dores
- restrições detalhadas
- objetivo do passo

Campos curtos continuam como `Input`:

- nome do plano
- país
- tom
- cargo
- senioridade
- CNAE
- quantidade

### Template HTML simples para outbound

O email de outbound usa um wrapper limpo, centrado e com CSS inline.

Motivo:

- A mensagem precisa ser revisável e consistente entre UI e envio.
- Emails frios tendem a performar melhor quando o HTML é leve.
- Brevo aceita `htmlContent` e `textContent`; ambos agora são enviados.

Trade-off:

- Ainda não há editor visual de template.
- A identidade visual é discreta por padrão, sem imagens ou blocos promocionais.

## Riscos e Limitações Conhecidas

- A seleção de empresas por query string pode gerar URLs longas para muitos leads.
- Não há persistência explícita de lista de empresas dentro da campanha antes da geração de mensagens.
- `BusinessProfile.offer` ainda não é usado diretamente no prompt final.
- Ainda não existe uma UI dedicada de `Material de marketing`.
- Ainda não há editor manual para alterar o HTML antes de enviar.
- Alguns testes novos são source-based para garantir estrutura de UI; eles protegem regressões simples, mas não substituem testes E2E completos.

## Próximos Passos Recomendados

1. Criar seção `Material de marketing` no plano.
2. Persistir campos como:
   - descrição da empresa
   - produto/serviço
   - dores que resolve
   - diferenciais
   - provas/cases
   - CTA/oferta
   - objeções comuns
3. Incluir esse material em `buildMessagePrompt`.
4. Criar tabela para empresas em campanha:
   - `CampaignLead`
   - status por empresa
   - origem da seleção
5. Trocar query params por persistência quando a seleção for confirmada na campanha.
6. Adicionar testes E2E estáveis para:
   - criar plano
   - descobrir empresas
   - selecionar ranking
   - criar campanha
   - preparar empresas
   - gerar sequência
