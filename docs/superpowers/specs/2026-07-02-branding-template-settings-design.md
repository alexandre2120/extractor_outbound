# Branding Template Settings Design

Data: 2026-07-02  
Projeto: `extractor_outbound`  
Fase: Template, branding e oferta a partir do site

## Objetivo

Criar uma camada revisavel de `EmailTemplateSettings` para transformar o template HTML atual, que hoje e fixo em codigo, em um template configuravel por workspace/perfil de negocio. A primeira versao deve permitir que um agente leia o site da empresa do usuario, sugira branding e material comercial, preencha o campo "O que voce vende (oferta)" como rascunho, e aplique esses settings ao preview e ao envio via Brevo somente depois de revisao/aprovacao humana.

## Fora de Escopo Nesta Fase

- Nao refinar campanhas com base no conteudo do site.
- Nao alterar o prompt de geracao de campanhas ou sequencias.
- Nao criar editor visual drag-and-drop de email.
- Nao integrar com API do Brevo para criar templates salvos dentro do painel Brevo.
- Nao adicionar tracking, unsubscribe ou compliance avancado alem do que ja existe no envio atual.

Esses itens ficam para a fase seguinte: "Refino de campanha pelo conteudo do site".

## Contexto Atual

O HTML de email esta centralizado em `apps/web/lib/email-template.ts`. Ele recebe apenas `subject` e `body`, gera um HTML leve com CSS inline, e e usado tanto no preview quanto no envio via `sendMessageAction`.

O onboarding atual cria `BusinessProfile` e `Plan`. O campo `BusinessProfile.offer` e salvo, mas o prompt final de mensagem usa principalmente dados do `Plan`: `objective`, `valueProp` e `tone`. Ainda nao existe tabela persistente para branding, template settings, assinatura, CTA, logo ou cores.

O pipeline de research existente consegue visitar sites e extrair texto factual para empresas alvo. A nova funcionalidade deve reaproveitar o mesmo principio, mas para o site da empresa usuaria.

## Abordagem Escolhida

Usar o modelo hibrido:

1. O usuario informa ou confirma o website da propria empresa.
2. Um agente pesquisa o site e sugere branding, oferta e template settings.
3. O resultado fica em rascunho.
4. O usuario revisa/edita.
5. Somente settings aprovados entram no preview e no envio real.

Motivo:

- Reduz trabalho manual de setup.
- Evita aplicar automaticamente uma interpretacao ruim do site.
- Mantem o usuario no controle sobre oferta, marca e CTA.

## Modelo de Dados

Adicionar um modelo novo, ligado ao workspace e opcionalmente ao `BusinessProfile`.

```prisma
model EmailTemplateSettings {
  id                String   @id @default(cuid())
  workspaceId       String
  businessProfileId String?

  status            TemplateSettingsStatus @default(DRAFT)
  source            TemplateSettingsSource @default(MANUAL)
  isActive          Boolean  @default(false)

  websiteUrl        String?
  brandName         String?
  logoUrl           String?
  primaryColor      String?
  accentColor       String?
  backgroundColor   String?
  fontFamily        String?

  senderName        String?
  senderRole        String?
  signature         String?
  ctaLabel          String?
  ctaUrl            String?

  offerSummary      String?
  valueProposition  String?
  tone              String?

  rawExtraction     Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  approvedAt        DateTime?

  workspace         Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  businessProfile   BusinessProfile? @relation(fields: [businessProfileId], references: [id], onDelete: SetNull)

  @@index([workspaceId])
  @@index([businessProfileId])
  @@index([workspaceId, status, isActive])
}

enum TemplateSettingsStatus {
  DRAFT
  APPROVED
}

enum TemplateSettingsSource {
  MANUAL
  WEBSITE_AGENT
}
```

Regra:

- Deve existir no maximo um setting com `status = APPROVED` e `isActive = true` por workspace na primeira versao.
- Pode haver rascunhos historicos, mas a UI deve mostrar o rascunho mais recente e o aprovado atual.
- Cores aceitas devem ser hex validos no formato `#RRGGBB`.
- URLs de logo e CTA devem ser `https://` ou vazias.
- `Workspace` deve ganhar a relation `emailTemplateSettings`.
- `BusinessProfile` deve ganhar a relation `emailTemplateSettings`.

## Extracao Pelo Site

Criar uma action "Gerar branding pelo site" na tela de planos/onboarding. Ela recebe `websiteUrl` e roda um job ou fluxo server-side que:

1. Normaliza o dominio.
2. Visita home e paginas relevantes, priorizando:
   - sobre
   - servicos/produtos
   - cases/clientes
   - contato
3. Extrai texto visivel, titulo, meta description, links internos, possiveis imagens de logo e cores CSS dominantes simples.
4. Usa IA para converter evidencias em settings estruturados.
5. Salva `EmailTemplateSettings` como `DRAFT` com `source = WEBSITE_AGENT`.

O agente deve retornar JSON validado por schema, com:

```ts
type ExtractedTemplateSettings = {
  brandName: string | null;
  websiteUrl: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  fontFamily: string | null;
  senderName: string | null;
  senderRole: string | null;
  signature: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  offerSummary: string | null;
  valueProposition: string | null;
  tone: string | null;
  evidenceRefs: string[];
};
```

## UI

Adicionar uma secao "Branding e template" na area de plano ou setup inicial.

Ela deve conter:

- Campo `Website da sua empresa`.
- Botao `Gerar pelo site`.
- Estado de processamento.
- Formulario editavel com:
  - nome da marca
  - logo URL
  - cor primaria
  - cor de destaque
  - cor de fundo
  - nome do remetente
  - cargo do remetente
  - assinatura
  - CTA label
  - CTA URL
  - oferta resumida
  - proposta de valor
  - tom
- Preview HTML usando os settings em rascunho.
- Botao `Aprovar template`.

Campos longos devem usar `Textarea`:

- assinatura
- oferta resumida
- proposta de valor
- tom, se virar instrucao longa

Campos curtos continuam como `Input`.

## Preenchimento de "O que Voce Vende (Oferta)"

Quando a extracao gerar `offerSummary`, a UI deve oferecer aplicar essa sugestao ao `BusinessProfile.offer`.

Regras:

- Nao sobrescrever automaticamente um valor existente.
- Se `BusinessProfile.offer` estiver vazio, mostrar a sugestao ja preenchida em rascunho no campo.
- Se `BusinessProfile.offer` tiver conteudo, mostrar uma acao explicita `Usar oferta sugerida`.
- Salvar a alteracao somente quando o usuario submeter/aprovar.

## Template HTML

Evoluir `renderOutboundEmailHtml` para aceitar settings opcionais.

Interface esperada:

```ts
type OutboundEmailTemplateInput = {
  subject?: string | null;
  body: string;
  settings?: EmailTemplateSettingsView | null;
};

type EmailTemplateSettingsView = {
  brandName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  fontFamily?: string | null;
  senderName?: string | null;
  senderRole?: string | null;
  signature?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
};
```

Comportamento:

- Sem settings aprovados, manter o HTML atual.
- Com settings aprovados, aplicar:
  - `backgroundColor` no fundo externo.
  - `primaryColor` em links/CTA.
  - `fontFamily` quando seguro; fallback para Arial.
  - logo no topo somente se `logoUrl` for `https://`.
  - assinatura no rodape do corpo.
  - CTA como link simples, nao botao pesado, para preservar entregabilidade.
- Sempre manter texto puro como fallback.
- Sempre escapar conteudo textual antes de inserir no HTML.
- Nunca inserir scripts, CSS externo ou imagens base64.

## Data Flow

```txt
Website URL
  -> branding extraction action/job
  -> research HTML/text evidence
  -> AI structured extraction
  -> EmailTemplateSettings DRAFT
  -> UI review/edit
  -> APPROVED + active settings
  -> MessagePreviewCard
  -> sendMessageAction
  -> Brevo htmlContent + textContent
```

## Erros e Estados Vazios

- Se o site nao abrir, marcar o job como falho e manter formulario manual disponivel.
- Se IA nao retornar JSON valido, mostrar erro e nao salvar settings parciais.
- Se logo/cor nao forem confiaveis, deixar vazio e usar defaults.
- Se nao houver settings aprovados, continuar usando o template simples atual.
- Se CTA URL for invalida, nao renderizar CTA.

## Testes

Testes unitarios:

- `email-template.test.ts`
  - sem settings, preserva template atual.
  - com settings, aplica cores, logo, assinatura e CTA.
  - escapa textos de settings e body.
  - ignora logo/CTA inseguros.
- Novo helper de validacao:
  - aceita `#RRGGBB`.
  - rejeita cores invalidas.
  - aceita apenas URLs `https://`.

Testes source-based:

- UI de planos usa `Textarea` para oferta/proposta/assinatura.
- `sendMessageAction` carrega settings aprovados antes de renderizar HTML.

Verificacao manual:

- Criar ou abrir plano.
- Informar website.
- Gerar settings.
- Editar oferta sugerida.
- Aprovar template.
- Gerar mensagem.
- Confirmar preview com branding.
- Enviar mensagem e confirmar que Brevo recebe `htmlContent` e `textContent`.

## Decisoes de Produto

- O agente sugere; o usuario aprova.
- A primeira versao tem um template aprovado por workspace.
- O foco e setup de marca/template, nao otimizacao de campanha.
- O conteudo extraido do site pode preencher oferta e proposta de valor, mas nao deve substituir automaticamente campos existentes.
- O template deve continuar leve para cold outbound.

## Proxima Fase

Depois desta fase, criar uma spec separada para "Refino de campanha pelo conteudo do site". Essa fase podera usar o mesmo material de branding/oferta para sugerir:

- ICP refinado.
- Segmentos.
- Personas.
- Objetivos de campanha.
- Sequencia de passos.
- Angulos por campanha.
- Objeções e provas.
