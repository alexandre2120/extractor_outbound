"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Button, cn } from "@repo/ui";
import { buildCampaignSelectionHref } from "@/lib/campaign-selection";
import {
  getDefaultRefinementSelection,
  getVisibleRankingRows,
  type RankingTierFilter,
} from "@/lib/ranking";
import { ScoreBar, StatusPill, TierBadge } from "./flow-ui";

type ActionResult = { ok: boolean; message: string };

export type PlanRankingRow = {
  id: string;
  companyId: string;
  name: string;
  domain: string | null;
  city: string | null;
  email: string | null;
  tier: string | null;
  score: number | null;
};

export function PlanRankingTable({
  planId,
  rows,
  refineAction,
}: {
  planId: string;
  rows: PlanRankingRow[];
  refineAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [emailOnly, setEmailOnly] = useState(false);
  const [tier, setTier] = useState<RankingTierFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      refineAction(formData),
    null,
  );

  const visibleRows = useMemo(
    () =>
      getVisibleRankingRows(
        rows.map((row) => ({
          ...row,
          id: row.companyId,
          hasEmail: !!row.email,
        })),
        { emailOnly, tier },
      ),
    [emailOnly, rows, tier],
  );

  const defaultIds = useMemo(
    () =>
      getDefaultRefinementSelection(
        rows.map((row) => ({
          id: row.companyId,
          tier: row.tier,
          hasEmail: !!row.email,
          score: row.score,
        })),
      ),
    [rows],
  );

  const allVisibleSelected =
    visibleRows.length > 0 &&
    visibleRows.every((row) => selected.includes(row.companyId));
  const campaignHref = buildCampaignSelectionHref(
    "/campaigns",
    selected,
    planId,
  );

  function toggleRow(companyId: string) {
    setSelected((current) =>
      current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId],
    );
  }

  function toggleAllVisible() {
    setSelected((current) => {
      if (allVisibleSelected) {
        return current.filter(
          (id) => !visibleRows.some((row) => row.companyId === id),
        );
      }

      return Array.from(
        new Set([...current, ...visibleRows.map((row) => row.companyId)]),
      );
    });
  }

  return (
    <div className="relative">
      <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold">Ranking</h2>
          <span className="text-xs text-muted-foreground">
            {visibleRows.length} empresas
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEmailOnly((value) => !value)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors",
              emailOnly
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-surface text-foreground hover:bg-surface-muted",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                emailOnly ? "bg-background" : "bg-foreground",
              )}
            />
            Só com e-mail
          </button>

          <div className="flex overflow-hidden rounded-md border border-border">
            {(["all", "A", "B", "C"] as RankingTierFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTier(value)}
                className={cn(
                  "h-8 border-r border-border px-3 text-xs font-medium last:border-r-0",
                  tier === value
                    ? "bg-foreground text-background"
                    : "bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {value === "all" ? "Todos" : value}
              </button>
            ))}
          </div>

          <form action={formAction}>
            {defaultIds.map((companyId) => (
              <input
                key={companyId}
                type="hidden"
                name="companyId"
                value={companyId}
              />
            ))}
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={pending || defaultIds.length === 0}
            >
              {pending ? "Refinando..." : "Refinar melhores"}
            </Button>
          </form>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              <th className="w-10 px-5 py-3">
                <input
                  aria-label="Selecionar empresas visíveis"
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  className="h-4 w-4 accent-foreground"
                />
              </th>
              <th className="w-12 px-3 py-3">#</th>
              <th className="px-3 py-3">Empresa</th>
              <th className="px-3 py-3">Cidade</th>
              <th className="px-3 py-3">E-mail</th>
              <th className="px-3 py-3">Tier</th>
              <th className="px-3 py-3">Score</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const checked = selected.includes(row.companyId);

              return (
                <tr
                  key={row.companyId}
                  className={cn(
                    "border-t border-border/70 transition-colors hover:bg-surface-muted/70",
                    checked && "bg-surface-muted",
                  )}
                >
                  <td className="px-5 py-3">
                    <input
                      aria-label={`Selecionar ${row.name}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRow(row.companyId)}
                      className="h-4 w-4 accent-foreground"
                    />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/companies/${row.companyId}`}
                      className="font-medium hover:underline"
                    >
                      {row.name}
                    </Link>
                    <div className="font-mono text-xs text-muted-foreground">
                      {row.domain ?? "sem domínio"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-foreground/80">
                    {row.city ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {row.email ? (
                      <StatusPill>
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-foreground" />
                        verificado
                      </StatusPill>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <TierBadge tier={row.tier} />
                  </td>
                  <td className="px-3 py-3">
                    <ScoreBar value={row.score} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state && (
        <div
          className={cn(
            "border-t border-border px-5 py-3 text-xs",
            state.ok ? "text-muted-foreground" : "text-red-600",
          )}
        >
          {state.message}
        </div>
      )}

      {selected.length > 0 && (
        <form
          action={formAction}
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-foreground px-4 py-2.5 text-background shadow-2xl"
        >
          {selected.map((companyId) => (
            <input
              key={companyId}
              type="hidden"
              name="companyId"
              value={companyId}
            />
          ))}
          <span className="whitespace-nowrap text-xs font-medium">
            {selected.length} selecionadas
          </span>
          <span className="h-5 w-px bg-background/25" />
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-xs text-background/70 hover:text-background"
          >
            Limpar
          </button>
          <Link
            href={campaignHref}
            className="rounded-md border border-background/25 px-3 py-1.5 text-xs font-medium hover:bg-background/10"
          >
            Adicionar à campanha
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            className="bg-background text-foreground hover:bg-background/90"
          >
            {pending ? "Refinando..." : "Refinar selecionadas"}
          </Button>
        </form>
      )}
    </div>
  );
}
