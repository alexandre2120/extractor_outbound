export type FlowStage =
  "icp" | "discovery" | "refinement" | "campaign" | "send";

export type PrimaryAction = {
  label: string;
  stage: FlowStage;
};

const STAGES: FlowStage[] = [
  "icp",
  "discovery",
  "refinement",
  "campaign",
  "send",
];

export function getStageIndex(stage: FlowStage): number {
  return STAGES.indexOf(stage);
}

export function getPlanPrimaryAction(state: {
  hasCountry: boolean;
  segmentCount: number;
  hasDiscoveryRun: boolean;
  discoveryActive: boolean;
  hasResults: boolean;
}): PrimaryAction {
  if (!state.hasCountry || state.segmentCount === 0) {
    return { label: "Completar ICP", stage: "icp" };
  }

  if (state.discoveryActive) {
    return { label: "Descobrindo empresas...", stage: "discovery" };
  }

  if (!state.hasDiscoveryRun || !state.hasResults) {
    return { label: "Descobrir empresas", stage: "discovery" };
  }

  return { label: "Refinar melhores", stage: "refinement" };
}

export function getCompanyPrimaryAction(state: {
  hasDomain: boolean;
  hasResearch: boolean;
  hasGeneratedEnrichment: boolean;
  hasApprovedEnrichment: boolean;
  hasCampaignMessage: boolean;
}): PrimaryAction {
  if (!state.hasDomain || !state.hasResearch) {
    return { label: "Pesquisar site", stage: "refinement" };
  }

  if (!state.hasGeneratedEnrichment && !state.hasApprovedEnrichment) {
    return { label: "Enriquecer (IA)", stage: "refinement" };
  }

  if (state.hasGeneratedEnrichment && !state.hasApprovedEnrichment) {
    return { label: "Aprovar", stage: "refinement" };
  }

  if (!state.hasCampaignMessage) {
    return { label: "Adicionar à campanha", stage: "campaign" };
  }

  return { label: "Ver na campanha", stage: "campaign" };
}

export function getCampaignPrimaryAction(state: {
  stepCount: number;
  messageCount: number;
  hasDraftMessages: boolean;
}): PrimaryAction {
  if (state.stepCount === 0) {
    return { label: "Adicionar passo", stage: "campaign" };
  }

  if (state.messageCount === 0) {
    return { label: "Gerar sequência", stage: "campaign" };
  }

  if (state.hasDraftMessages) {
    return { label: "Revisar e enviar", stage: "send" };
  }

  return { label: "Acompanhar eventos", stage: "send" };
}
