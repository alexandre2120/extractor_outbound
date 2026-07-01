# UX SPEC — Outbound plan-first (para design / Claude design)

> Documento de entrada para desenho de UI. Descreve telas, hierarquia e **CTAs**.
> Estética: minimalista, preto/branco/cinza, estilo shadcn/ui (ver
> `docs/design/design-system.md` para tokens). Idioma da interface: **PT**.

---

## 1. Produto em uma frase

Ferramenta de outbound **plan-first**: o usuário define um ICP (plano), a ferramenta
**descobre** empresas com e-mail exposto e a **IA ranqueia**; os melhores são
**refinados** (a IA lê o site e infere fit + ângulo) e viram **campanhas** de e-mail
com rastreio de eventos.

**Usuário:** operador de vendas/fundador fazendo outbound B2B (PT/BR). Não é técnico.
Quer poucos cliques e saber sempre **qual é o próximo passo**.

---

## 2. Princípio central de UX: "Next Best Action" (resolve a dor dos CTAs)

O problema atual é excesso de botões simultâneos. Regra do desenho:

- **Cada entidade (Plano, Empresa, Campanha) tem UM CTA primário** por vez,
  calculado pelo seu estágio. Ele é o único botão preto/sólido na tela.
- Ações alternativas ficam **secundárias** (outline/ghost) ou dentro de um menu "⋯".
- Um **stepper/indicador de estágio** mostra onde a entidade está no fluxo.
- Sempre que uma ação for assíncrona (worker), o CTA vira estado "processando…"
  e a tela se atualiza sozinha quando conclui.

### Estágios → CTA primário

| Entidade | Estágio | CTA primário |
| --- | --- | --- |
| Plano | ICP incompleto (sem segmento/país) | **Completar ICP** |
| Plano | ICP pronto, sem rodada | **Descobrir empresas** |
| Plano | rodada concluída | **Refinar melhores** (research+IA em lote) |
| Empresa | sem pesquisa | **Pesquisar site** |
| Empresa | pesquisada, sem enrich | **Enriquecer (IA)** |
| Empresa | enrich gerado | **Aprovar** |
| Empresa | aprovada | **Adicionar à campanha** |
| Campanha | sem passos | **Adicionar passo** |
| Campanha | com passos | **Gerar sequência** |
| Campanha | mensagens em rascunho | **Revisar e enviar** |

---

## 3. Jornada guiada (fluxo feliz, do zero ao envio)

1. **Criar plano** (ICP: oferta, país, segmento, persona).
2. **Descobrir empresas** → lista ranqueada (score + tier A/B/C, e-mail, cidade).
3. **Refinar os melhores** → IA lê o site dos tier A/B, re-ranqueia e gera o ângulo.
4. **Adicionar top N à campanha** → cria/alimenta uma sequência.
5. **Gerar sequência** (mensagens por passo) → **Revisar e enviar** (Brevo).
6. **Acompanhar eventos** (enviado/aberto/clique/bounce).

O desenho deve deixar essa espinha visível (um stepper horizontal no topo do plano:
`ICP → Descoberta → Refino → Campanha → Envio`).

---

## 4. Arquitetura de informação (telas)

```
/                 Dashboard — estado geral + próxima ação
/plans            Lista de planos + criar
/plans/[id]       Plano: ICP + Descoberta + Ranking + Refino   (tela-comando)
/companies        microCRM — todas as empresas (filtros)
/companies/[id]   Empresa: camadas de verdade + ações por estágio
/campaigns        Lista de campanhas + criar
/campaigns/[id]   Campanha: sequência + mensagens + eventos
```

---

## 5. Tela a tela

### 5.1 Dashboard (`/`)
- **Objetivo:** orientar. Mostrar o plano ativo e sua próxima ação.
- **Blocos:** (a) card "Continuar" com o CTA de próxima ação do plano ativo; (b)
  números-chave (empresas descobertas, com e-mail, campanhas ativas, e-mails enviados);
  (c) pipeline visual (5 etapas) como referência.
- **CTA primário:** "Continuar → [próxima ação]". Se não há plano: **Criar plano**.
- **Estados:** vazio (sem plano) → onboarding em 1 card.

### 5.2 Plano (`/plans/[id]`) — TELA-COMANDO
Tela mais importante. Organizar em seções com o **stepper** no topo.

- **Cabeçalho:** nome do plano, badges de país/mercado, stepper de estágio.
- **Seção ICP (colapsável):** oferta, país (select), segmentos, personas, restrições.
  Edição inline. Não competir visualmente com o CTA principal.
- **Seção Descoberta:** input "quantas empresas (5–30)" + **CTA primário**
  contextual (Descobrir empresas / Descobrir mais). Mostra status da última rodada.
- **Seção Ranking (resultado):** **tabela ranqueada** — colunas: empresa (nome+domínio),
  cidade, e-mail (badge se tem), tier (A/B/C), score. Ordenável.
  - **Filtros:** "só com e-mail", por tier.
  - **Seleção em massa** (checkbox) → barra de ação flutuante com **CTA em lote**:
    "Refinar selecionadas" e "Adicionar à campanha".
  - Ação em lote padrão sugerida: **Refinar melhores** (pré-seleciona tier A/B).
  - Linha clicável → abre a empresa.
- **Estados:** descoberta rodando → skeleton + "worker processando, atualiza sozinho".
  Rodada sem e-mails → aviso + dica de refinar query/segmento.

### 5.3 Empresa (`/companies/[id]`)
- **Cabeçalho:** nome, domínio, cidade, **tier/score** da última rodada, e-mail.
- **CTA primário por estágio** (topo direito, único botão sólido). Demais ações no "⋯".
- **Camadas de verdade** (3 cards discretos, com rótulo de origem):
  - `registry` — dados cadastrais (quando houver, ex. CNPJ no BR).
  - `website` — resumo factual da pesquisa (research) + link às evidências (URL+data).
  - `ai` — enrichment: **fit score**, **ângulo de abordagem**, hipóteses; badge de status.
- **Mensagens:** lista com status; enviar/ver eventos.
- **Estados:** cada camada tem seu vazio ("ainda não pesquisado" → CTA pesquisar).

### 5.4 Campanha (`/campaigns/[id]`)
- **Cabeçalho:** nome, status (Draft/Ativa/Pausada), CTA primário por estágio.
- **Sequência:** passos (ordem, dia de atraso, objetivo) — adicionar/remover; visual de timeline.
- **Adicionar empresas:** a partir do ranking do plano ou de empresas aprovadas
  (multi-seleção). Botão "Gerar sequência" gera mensagens por passo.
- **Mensagens:** agrupadas por empresa/passo; **Revisar e enviar**; eventos por mensagem
  (enviado/aberto/clique/bounce) como pequenos chips.
- **Estados:** sem passos → foco em "Adicionar passo".

---

## 6. Componentes a projetar (reuso shadcn/ui)

- **StageStepper** — 5 etapas, marca a atual (usado no plano e no dashboard).
- **PrimaryActionButton** — o único CTA sólido; suporta estado "processando…".
- **RankTable** — tabela ranqueada com tier badge (A sólido, B neutro, C outline),
  score tabular, seleção em massa e barra de ação flutuante.
- **TruthLayerCard** — card com rótulo de origem (registry/website/ai) e estado vazio.
- **StatusBadge** — estados de job/enrich/mensagem em tons neutros (sem semáforo colorido).
- **AsyncNotice** — faixa "worker processando… atualiza sozinho".
- **EmptyState** — ícone discreto + 1 linha + CTA.
- **BulkActionBar** — barra fixa inferior quando há seleção (contagem + ações).

---

## 7. Estados globais e microcopy

- **Loading assíncrono:** nunca "spinner infinito" — sempre o texto do que está
  acontecendo ("Descobrindo empresas…", "IA lendo o site…").
- **Sucesso/erro:** toast curto e específico. Erro sempre com próximo passo.
- **CTAs (texto):** verbos diretos — *Descobrir empresas*, *Refinar melhores*,
  *Enriquecer (IA)*, *Aprovar*, *Adicionar à campanha*, *Revisar e enviar*.
- **Evitar:** jargão técnico na UI (nada de "enqueue", "worker", "schema").

---

## 8. Linguagem visual

- Base neutra: fundo cinza muito claro, cards branco acinzentado, bordas suaves.
- Preto suave só para o CTA primário e ênfases; nada saturado, sem gradiente.
- Tipografia discreta e legível; hierarquia por peso/tamanho, não por cor.
- Densidade moderada; listas com divisórias sutis.
- Tokens em `docs/design/design-system.md`.

---

## 9. Fora de escopo do desenho agora

- Multi-usuário / permissões / billing.
- Dashboard de métricas avançado (fica para depois do fluxo base).
- Telas de configuração de integrações (chaves ficam em `.env`).

---

## 10. Como usar este documento

- Entregue este arquivo ao **Claude design** (ou Figma Make / Claude in Figma) pedindo:
  *"Desenhe as telas 5.1–5.4 seguindo o padrão Next Best Action da seção 2 e os
  tokens neutros da seção 8."*
- Comece pela **tela 5.2 (Plano)** — é a tela-comando e resolve 80% da dor de CTA.
