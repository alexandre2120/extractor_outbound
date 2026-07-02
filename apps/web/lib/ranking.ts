export type RankingTierFilter = "all" | "A" | "B" | "C";

export type RankingRowBase = {
  id: string;
  tier: string | null;
  hasEmail: boolean;
  score: number | null;
};

export function getVisibleRankingRows<T extends RankingRowBase>(
  rows: T[],
  filters: { emailOnly: boolean; tier: RankingTierFilter },
): T[] {
  return rows
    .filter((row) => !filters.emailOnly || row.hasEmail)
    .filter((row) => filters.tier === "all" || row.tier === filters.tier)
    .slice()
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

export function getDefaultRefinementSelection(
  rows: RankingRowBase[],
): string[] {
  return rows
    .filter((row) => row.hasEmail && (row.tier === "A" || row.tier === "B"))
    .map((row) => row.id);
}
