import { z } from "zod";

/**
 * Contratos de orquestração por microagentes. O orquestrador valida o
 * pré-requisito documental antes de despachar qualquer agente (Docs Guardian).
 */

export const AGENTS = [
  "foundation",
  "docker-infra",
  "database",
  "domain-modeling",
  "data-providers",
  "browser-research",
  "ai-gateway",
  "outbound-messaging",
  "frontend-ui",
  "progress-tracker",
  "docs-guardian",
] as const;

export type AgentName = (typeof AGENTS)[number];

export const agentContract = z.object({
  agent: z.enum(AGENTS),
  /** Documentos que o agente DEVE ler antes de agir. */
  requiresDocs: z.array(z.string()),
  /** Documentos/artefatos que o agente produz. */
  producesDocs: z.array(z.string()),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  acceptance: z.array(z.string()),
  dependsOn: z.array(z.enum(AGENTS)).default([]),
});
export type AgentContract = z.infer<typeof agentContract>;

export interface DocCheckResult {
  ok: boolean;
  missing: string[];
}

/**
 * Regra de inicialização do orquestrador: bloqueia execução sem contexto
 * documental mínimo. Retorna os docs faltantes.
 */
export function checkDocsPrerequisite(
  contract: AgentContract,
  existingDocs: Set<string>,
): DocCheckResult {
  const missing = contract.requiresDocs.filter((d) => !existingDocs.has(d));
  return { ok: missing.length === 0, missing };
}

export const AGENT_CONTRACTS: Record<AgentName, AgentContract> = {
  foundation: {
    agent: "foundation",
    requiresDocs: ["docs/product/vision.md", "docs/architecture/system-overview.md"],
    producesDocs: ["docs/operations/runbook-local.md"],
    inputs: ["spec"],
    outputs: ["monorepo", "tooling"],
    acceptance: ["pnpm install ok", "typecheck ok"],
    dependsOn: [],
  },
  "docker-infra": {
    agent: "docker-infra",
    requiresDocs: ["docs/architecture/services.md", "docs/architecture/env-contract.md"],
    producesDocs: ["docs/operations/docker.md"],
    inputs: ["compose.yaml", ".env.example"],
    outputs: ["serviços locais up"],
    acceptance: ["docker compose up healthy"],
    dependsOn: ["foundation"],
  },
  database: {
    agent: "database",
    requiresDocs: ["docs/domain/entities.md"],
    producesDocs: ["docs/domain/entities.md"],
    inputs: ["schema.prisma"],
    outputs: ["migrations", "seed"],
    acceptance: ["migrate dev ok", "seed ok"],
    dependsOn: ["foundation", "domain-modeling"],
  },
  "domain-modeling": {
    agent: "domain-modeling",
    requiresDocs: ["docs/product/scope.md"],
    producesDocs: ["docs/domain/entities.md", "docs/domain/workflows.md", "docs/domain/state-machines.md"],
    inputs: ["spec"],
    outputs: ["modelo de domínio"],
    acceptance: ["entidades documentadas"],
    dependsOn: [],
  },
  "data-providers": {
    agent: "data-providers",
    requiresDocs: ["docs/integrations/cnpj.md", "docs/integrations/portugal-providers.md"],
    producesDocs: ["docs/integrations/cnpj.md"],
    inputs: ["provider adapters"],
    outputs: ["ingestão de empresas"],
    acceptance: ["adapter contract testado"],
    dependsOn: ["database"],
  },
  "browser-research": {
    agent: "browser-research",
    requiresDocs: ["docs/integrations/browser-research.md"],
    producesDocs: ["docs/integrations/browser-research.md"],
    inputs: ["company domain"],
    outputs: ["evidências", "snapshot", "score"],
    acceptance: ["job roda local"],
    dependsOn: ["database"],
  },
  "ai-gateway": {
    agent: "ai-gateway",
    requiresDocs: ["docs/integrations/kie.md"],
    producesDocs: ["docs/integrations/kie.md"],
    inputs: ["prompts", "evidências"],
    outputs: ["enrichment estruturado"],
    acceptance: ["output validado por schema"],
    dependsOn: ["browser-research"],
  },
  "outbound-messaging": {
    agent: "outbound-messaging",
    requiresDocs: ["docs/integrations/brevo.md"],
    producesDocs: ["docs/integrations/brevo.md"],
    inputs: ["plan", "company", "enrichment"],
    outputs: ["mensagens", "delivery events"],
    acceptance: ["envio registrado"],
    dependsOn: ["ai-gateway"],
  },
  "frontend-ui": {
    agent: "frontend-ui",
    requiresDocs: ["docs/design/design-system.md", "docs/design/ux-rules.md"],
    producesDocs: ["docs/design/components.md"],
    inputs: ["design tokens"],
    outputs: ["páginas", "componentes"],
    acceptance: ["visual minimalista consistente"],
    dependsOn: ["foundation"],
  },
  "progress-tracker": {
    agent: "progress-tracker",
    requiresDocs: [],
    producesDocs: [],
    inputs: ["/tracking/*.json"],
    outputs: ["tracking/index.html"],
    acceptance: ["página reflete status"],
    dependsOn: [],
  },
  "docs-guardian": {
    agent: "docs-guardian",
    requiresDocs: [],
    producesDocs: ["docs/agents/task-checklist.md"],
    inputs: ["contratos de agentes"],
    outputs: ["bloqueio sem documentação"],
    acceptance: ["execução sem doc é bloqueada"],
    dependsOn: [],
  },
};
