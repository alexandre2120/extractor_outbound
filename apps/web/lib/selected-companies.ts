export type SelectedCompanyInput = {
  id: string;
  name: string;
  domain: string | null;
  email: string | null;
  websiteSummary: string | null;
  researchStatuses: string[];
  enrichmentStatuses: string[];
};

export type SelectedCompanyReadiness = {
  ready: string[];
  needsApproval: string[];
  needsEnrichment: string[];
  needsResearch: string[];
  blocked: string[];
};

export type SelectedCompanyPrepIds = {
  approveIds: string[];
  enrichIds: string[];
  researchIds: string[];
};

export function getSelectedCompanyReadiness(
  companies: SelectedCompanyInput[],
): SelectedCompanyReadiness {
  const readiness: SelectedCompanyReadiness = {
    ready: [],
    needsApproval: [],
    needsEnrichment: [],
    needsResearch: [],
    blocked: [],
  };

  for (const company of companies) {
    const enrichmentStatuses = new Set(company.enrichmentStatuses);
    const researchStatuses = new Set(company.researchStatuses);
    const hasContactPath = Boolean(company.domain || company.email);

    if (enrichmentStatuses.has("APPROVED")) {
      readiness.ready.push(company.id);
      continue;
    }

    if (
      enrichmentStatuses.has("GENERATED") ||
      enrichmentStatuses.has("REVIEWED")
    ) {
      readiness.needsApproval.push(company.id);
      continue;
    }

    if (enrichmentStatuses.has("DRAFT")) {
      readiness.blocked.push(company.id);
      continue;
    }

    if (company.websiteSummary) {
      readiness.needsEnrichment.push(company.id);
      continue;
    }

    if (researchStatuses.has("PENDING") || researchStatuses.has("RUNNING")) {
      readiness.blocked.push(company.id);
      continue;
    }

    if (hasContactPath) {
      readiness.needsResearch.push(company.id);
      continue;
    }

    readiness.blocked.push(company.id);
  }

  return readiness;
}

export function getSelectedCompanyPrepIds(
  companies: SelectedCompanyInput[],
): SelectedCompanyPrepIds {
  const readiness = getSelectedCompanyReadiness(companies);

  return {
    approveIds: readiness.needsApproval,
    enrichIds: readiness.needsEnrichment,
    researchIds: readiness.needsResearch,
  };
}
