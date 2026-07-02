export type SearchParamsLike = Record<string, string | string[] | undefined>;

export function getSelectedCompanyIds(
  searchParams: SearchParamsLike,
): string[] {
  const raw = searchParams.companyId;
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export function getSelectedPlanId(
  searchParams: SearchParamsLike,
): string | null {
  const raw = searchParams.planId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || null;
}

export function buildCampaignSelectionHref(
  pathname: string,
  companyIds: string[],
  planId?: string | null,
): string {
  const params = new URLSearchParams();
  for (const companyId of companyIds) {
    const value = companyId.trim();
    if (value) params.append("companyId", value);
  }
  if (planId) params.set("planId", planId);

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
