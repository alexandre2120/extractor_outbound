/**
 * Prompts versionados e centralizados. A IA interpreta evidências recentes +
 * dados estruturados; nunca atua como fonte primária de verdade cadastral.
 */

export interface EnrichmentPromptInput {
  planObjective: string;
  valueProp: string;
  companyName: string;
  registryFacts: string;
  websiteEvidence: string;
}

export const ENRICHMENT_SYSTEM = `Você é um analista de inteligência comercial B2B.
Regras invioláveis:
- Use APENAS os fatos fornecidos (registro + evidências do site). Não invente dados.
- Se um fato não estiver nas evidências, marque como desconhecido.
- Produza inferência comercial, nunca verdade cadastral.
- Responda SOMENTE em JSON válido conforme o schema solicitado.`;

export function buildEnrichmentPrompt(i: EnrichmentPromptInput): string {
  return `Objetivo do plano: ${i.planObjective}
Proposta de valor da empresa usuária: ${i.valueProp}

Empresa alvo: ${i.companyName}

Dados cadastrais (verdade estruturada):
${i.registryFacts || "(sem dados cadastrais)"}

Evidências do site (fatos públicos observados):
${i.websiteEvidence || "(sem evidências de site)"}

Gere um JSON com: fitScore (0-100), hypotheses (lista), approachAngle (string),
reasoning (string), evidenceRefs (urls usadas).`;
}

export interface MessagePromptInput {
  planObjective: string;
  valueProp: string;
  tone: string;
  companyName: string;
  approachAngle: string;
  factualSummary: string;
}

export const MESSAGE_SYSTEM = `Você escreve cold emails B2B curtos, específicos e sem clichês.
- Personalize com base nas evidências reais da empresa alvo.
- Sem promessas vagas, sem "AI slop", sem floreio.
- Responda SOMENTE em JSON: { subject, body, channel }.`;

export function buildMessagePrompt(i: MessagePromptInput): string {
  return `Objetivo: ${i.planObjective}
Proposta de valor: ${i.valueProp}
Tom: ${i.tone || "direto e consultivo"}

Empresa alvo: ${i.companyName}
Ângulo de abordagem sugerido: ${i.approachAngle}
Resumo factual da empresa: ${i.factualSummary}

Escreva um cold email curto (máx. 120 palavras) com assunto e corpo.`;
}
