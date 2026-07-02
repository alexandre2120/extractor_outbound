import { loadEnv, hasIntegration } from "@repo/config";
import {
  buildEnrichmentPrompt,
  ENRICHMENT_SYSTEM,
  buildMessagePrompt,
  MESSAGE_SYSTEM,
  buildTemplateSettingsPrompt,
  TEMPLATE_SETTINGS_SYSTEM,
  buildRankingPrompt,
  RANKING_SYSTEM,
  type EnrichmentPromptInput,
  type MessagePromptInput,
  type TemplateSettingsPromptInput,
  type RankingPromptInput,
} from "@repo/prompts";
import {
  aiEnrichmentOutput,
  extractedTemplateSettingsOutput,
  generatedMessageOutput,
  rankingOutput,
  type AIEnrichmentOutput,
  type ExtractedTemplateSettingsOutput,
  type GeneratedMessageOutput,
  type RankingOutput,
} from "@repo/schemas";
import { CnpjaProvider } from "./cnpj";
import { KieClient } from "./kie";
import { BrevoClient } from "./brevo";

export * from "./cnpj";
export * from "./kie";
export * from "./brevo";
export * from "./research";
export * from "./research-playwright";
export {
  researchBrandingWebsite,
  type BrandingResearchOutput,
} from "./branding-research";
export { duckDuckGoProvider, type SearchHit, type SearchProvider } from "./search";
export { extractEmail, type EmailResult } from "./email-extract";
export { ApolloClient, type ApolloOrg } from "./apollo";
export {
  runDiscovery,
  buildDiscoveryQuery,
  type DiscoveredCompany,
  type DiscoveryOptions,
} from "./discovery";

import { runResearch, type ResearchOutput } from "./research";
import { runResearchPlaywright } from "./research-playwright";

/**
 * Research preferindo Playwright (renderiza JS); cai para o fetch v1 se o
 * Chromium não estiver instalado ou falhar no launch.
 */
export async function researchCompany(
  domain: string,
  opts: { timeoutMs?: number; maxPages?: number; headless?: boolean } = {},
): Promise<ResearchOutput & { engine: "playwright" | "fetch" }> {
  try {
    const out = await runResearchPlaywright(domain, opts);
    return { ...out, engine: "playwright" };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    // Browser ausente/erro de launch → fallback transparente.
    if (/Executable doesn't exist|browserType\.launch|playwright/i.test(msg)) {
      const out = await runResearch(domain, opts);
      return { ...out, engine: "fetch" };
    }
    throw e;
  }
}

/** Constrói os clients disponíveis a partir do ambiente (gating por chave). */
export function clientsFromEnv() {
  const env = loadEnv();
  return {
    env,
    cnpja: hasIntegration(env, "cnpja")
      ? new CnpjaProvider(env.CNPJA_API_KEY!)
      : null,
    kie: hasIntegration(env, "kie")
      ? new KieClient(env.KIE_API_KEY!, env.KIE_BASE_URL, env.KIE_DEFAULT_MODEL)
      : null,
    brevo: hasIntegration(env, "brevo")
      ? new BrevoClient(env.BREVO_API_KEY!, {
          email: env.BREVO_SENDER_EMAIL!,
          name: env.BREVO_SENDER_NAME,
        })
      : null,
  };
}

/** Gera enrichment estruturado e validado por schema. */
export async function enrichCompany(
  kie: KieClient,
  input: EnrichmentPromptInput,
): Promise<{ result: AIEnrichmentOutput; creditsConsumed?: number; model: string }> {
  const { data, creditsConsumed } = await kie.chatJson(
    [
      { role: "system", content: ENRICHMENT_SYSTEM },
      { role: "user", content: buildEnrichmentPrompt(input) },
    ],
    { maxTokens: 800 },
  );
  const result = aiEnrichmentOutput.parse(data);
  return { result, creditsConsumed, model: "kie" };
}

/** Ranqueia uma empresa descoberta por fit ao ICP (saída validada). */
export async function rankCompany(
  kie: KieClient,
  input: RankingPromptInput,
): Promise<{ result: RankingOutput; creditsConsumed?: number }> {
  const { data, creditsConsumed } = await kie.chatJson(
    [
      { role: "system", content: RANKING_SYSTEM },
      { role: "user", content: buildRankingPrompt(input) },
    ],
    { maxTokens: 500 },
  );
  const result = rankingOutput.parse(data);
  return { result, creditsConsumed };
}

/** Gera cold email validado por schema. */
export async function generateColdMessage(
  kie: KieClient,
  input: MessagePromptInput,
): Promise<{ result: GeneratedMessageOutput; creditsConsumed?: number }> {
  const { data, creditsConsumed } = await kie.chatJson(
    [
      { role: "system", content: MESSAGE_SYSTEM },
      { role: "user", content: buildMessagePrompt(input) },
    ],
    { maxTokens: 500 },
  );
  const result = generatedMessageOutput.parse(data);
  return { result, creditsConsumed };
}

export async function extractTemplateSettings(
  kie: KieClient,
  input: TemplateSettingsPromptInput,
): Promise<{ result: ExtractedTemplateSettingsOutput; creditsConsumed?: number }> {
  const { data, creditsConsumed } = await kie.chatJson(
    [
      { role: "system", content: TEMPLATE_SETTINGS_SYSTEM },
      { role: "user", content: buildTemplateSettingsPrompt(input) },
    ],
    { maxTokens: 900 },
  );
  const result = extractedTemplateSettingsOutput.parse(data);
  return { result, creditsConsumed };
}
