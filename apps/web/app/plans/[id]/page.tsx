import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Field, Input, Textarea } from "@repo/ui";
import { prisma } from "@repo/db";
import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  AsyncNotice,
  EmptyState,
  PageHeader,
  SectionCard,
  SectionTitle,
  StageStepper,
  StatusPill,
} from "@/components/flow-ui";
import { PlanRankingTable } from "@/components/plan-ranking-table";
import { TemplateSettingsPanel } from "@/components/template-settings-panel";
import { getPlanPrimaryAction } from "@/lib/flow";
import { getDefaultRefinementSelection } from "@/lib/ranking";
import { getWorkspace } from "@/lib/workspace";
import {
  addConstraintAction,
  addPersonaAction,
  addSegmentAction,
  refineCompaniesAction,
  removeConstraintAction,
  removePersonaAction,
  removeSegmentAction,
  runDiscoveryAction,
  setPlanLocationAction,
  updatePlanAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function PlanDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getWorkspace();
  const plan = await prisma.plan.findFirst({
    where: { id, workspaceId: ws.id },
    include: {
      businessProfile: true,
      markets: true,
      countries: true,
      segments: { orderBy: { label: "asc" } },
      personas: { orderBy: { role: "asc" } },
      constraints: { orderBy: { type: "asc" } },
      workspace: {
        include: {
          emailTemplateSettings: {
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });
  if (!plan) notFound();

  const lastRun = await prisma.discoveryRun.findFirst({
    where: { planId: id },
    orderBy: { createdAt: "desc" },
    include: {
      results: {
        orderBy: [{ rankScore: "desc" }, { emailFound: "desc" }],
        include: { company: true },
      },
    },
  });
  const discoveryActive =
    lastRun?.status === "PENDING" || lastRun?.status === "RUNNING";
  const currentCountry = plan.countries[0]?.countryCode ?? "";
  const primary = getPlanPrimaryAction({
    hasCountry: plan.countries.length > 0,
    segmentCount: plan.segments.length,
    hasDiscoveryRun: !!lastRun,
    discoveryActive,
    hasResults: (lastRun?.results.length ?? 0) > 0,
  });

  const rankingRows =
    lastRun?.results.map((result) => ({
      id: result.id,
      companyId: result.company.id,
      name: result.company.name,
      domain: result.company.domain,
      city: result.company.city,
      email: result.company.email,
      tier: result.tier,
      score: result.rankScore,
    })) ?? [];
  const defaultRefinementIds = getDefaultRefinementSelection(
    rankingRows.map((row) => ({
      id: row.companyId,
      tier: row.tier,
      hasEmail: !!row.email,
      score: row.score,
    })),
  );
  const draftTemplateSettings =
    plan.workspace.emailTemplateSettings.find(
      (settings) => settings.status === "DRAFT",
    ) ?? null;
  const approvedTemplateSettings =
    plan.workspace.emailTemplateSettings.find(
      (settings) => settings.status === "APPROVED" && settings.isActive,
    ) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <StageStepper current={primary.stage} />

      <PageHeader
        eyebrow="Plano"
        title={plan.name}
        description="Descubra, ranqueie e refine as empresas certas antes de escrever qualquer mensagem."
        action={
          <PlanPrimaryAction
            planId={plan.id}
            label={primary.label}
            stage={primary.stage}
            companyIds={defaultRefinementIds}
          />
        }
      >
        {plan.countries.map((country) => (
          <StatusPill key={country.id} variant="outline">
            {country.countryCode}
          </StatusPill>
        ))}
        {plan.markets.map((market) => (
          <StatusPill key={market.id} variant="outline">
            {market.market}
          </StatusPill>
        ))}
      </PageHeader>

      <AutoRefresh active={!!discoveryActive} />
      {discoveryActive && (
        <AsyncNotice
          title="Descobrindo empresas..."
          description="O worker está buscando empresas, validando e-mails e ranqueando a rodada."
        />
      )}

      <SectionCard id="icp">
        <details open>
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-lg text-muted-foreground">›</span>
              <div>
                <h2 className="text-sm font-semibold">
                  ICP · Perfil de cliente ideal
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Oferta, país, segmentos e personas que alimentam a descoberta.
                </p>
              </div>
            </div>
            <StatusPill>
              {primary.stage === "icp" ? "incompleto" : "ICP pronto"}
            </StatusPill>
          </summary>

          <div className="grid gap-5 border-t border-border/70 px-5 py-5 lg:grid-cols-[1.15fr_0.85fr]">
            <ActionForm
              action={updatePlanAction.bind(null, plan.id)}
              submitLabel="Salvar ICP"
            >
              <Field label="Nome do plano">
                <Input name="name" defaultValue={plan.name} />
              </Field>
              <Field label="Objetivo comercial">
                <Textarea name="objective" defaultValue={plan.objective} />
              </Field>
              <Field label="Proposta de valor">
                <Textarea
                  name="valueProp"
                  defaultValue={plan.valueProp ?? ""}
                />
              </Field>
              <Field label="Tom">
                <Input name="tone" defaultValue={plan.tone ?? ""} />
              </Field>
            </ActionForm>

            <div className="flex flex-col gap-4">
              <ActionForm
                action={setPlanLocationAction.bind(null, plan.id)}
                submitLabel="Salvar país"
              >
                <Field label="País do plano">
                  <select
                    name="country"
                    defaultValue={currentCountry || "PT"}
                    className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="PT">Portugal</option>
                    <option value="BR">Brasil</option>
                  </select>
                </Field>
              </ActionForm>

              <InlineList
                title="Segmentos"
                empty="Nenhum segmento."
                items={plan.segments.map((segment) => ({
                  id: segment.id,
                  title: segment.label,
                  detail:
                    [
                      segment.keywords && `kw: ${segment.keywords}`,
                      segment.cnaeCodes && `CNAE: ${segment.cnaeCodes}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—",
                  remove: removeSegmentAction.bind(null, segment.id, plan.id),
                }))}
              />
              <ActionForm
                action={addSegmentAction.bind(null, plan.id)}
                submitLabel="Adicionar segmento"
              >
                <Field label="Segmento">
                  <Input name="label" placeholder="SaaS B2B" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Palavras-chave">
                    <Input name="keywords" placeholder="logística,dados,ops" />
                  </Field>
                  <Field label="CNAEs">
                    <Input name="cnaeCodes" placeholder="7311400" />
                  </Field>
                </div>
              </ActionForm>

              <InlineList
                title="Personas"
                empty="Nenhuma persona."
                items={plan.personas.map((persona) => ({
                  id: persona.id,
                  title: persona.role,
                  detail:
                    [persona.seniority, persona.painPoints]
                      .filter(Boolean)
                      .join(" · ") || "—",
                  remove: removePersonaAction.bind(null, persona.id, plan.id),
                }))}
              />
              <ActionForm
                action={addPersonaAction.bind(null, plan.id)}
                submitLabel="Adicionar persona"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Cargo">
                    <Input name="role" placeholder="COO" />
                  </Field>
                  <Field label="Senioridade">
                    <Input name="seniority" placeholder="Head/C-level" />
                  </Field>
                </div>
                <Field label="Dores">
                  <Textarea
                    name="painPoints"
                    placeholder="SLA, custo por pedido, ruptura"
                  />
                </Field>
              </ActionForm>
            </div>
          </div>
        </details>
      </SectionCard>

      <TemplateSettingsPanel
        planId={plan.id}
        currentOffer={plan.businessProfile?.offer ?? null}
        draft={draftTemplateSettings}
        approved={approvedTemplateSettings}
      />

      <SectionCard>
        <SectionTitle
          title="Descoberta"
          description="Quantas empresas buscar nesta rodada?"
          action={
            lastRun && (
              <StatusPill
                variant={lastRun.status === "DONE" ? "solid" : "outline"}
              >
                {lastRun.status} · {lastRun.found} encontradas ·{" "}
                {lastRun.withEmail} com e-mail
              </StatusPill>
            )
          }
        />
        <div className="px-5 py-5">
          <ActionForm
            action={runDiscoveryAction.bind(null, plan.id)}
            submitLabel="Descobrir empresas"
          >
            <div className="flex flex-col gap-3 sm:max-w-sm">
              <Field label="Quantidade (5–30)">
                <Input
                  name="requested"
                  type="number"
                  min={5}
                  max={30}
                  defaultValue="12"
                />
              </Field>
            </div>
          </ActionForm>
          {lastRun?.error && (
            <div className="mt-4 rounded-md border border-border bg-surface-muted p-3 text-xs text-muted-foreground">
              Erro da última rodada: {lastRun.error}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard>
        {rankingRows.length > 0 ? (
          <PlanRankingTable
            planId={plan.id}
            rows={rankingRows}
            refineAction={refineCompaniesAction.bind(null, plan.id)}
          />
        ) : (
          <div className="p-5">
            <EmptyState
              title="Nenhuma empresa ainda"
              description="Rode a descoberta acima para gerar seu ranking de empresas."
            />
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle
          title="Restrições"
          description="Regras extras que refinam a busca sem poluir a ação principal."
        />
        <div className="px-5 py-5">
          <InlineList
            title="Regras"
            empty="Nenhuma restrição."
            items={plan.constraints.map((constraint) => ({
              id: constraint.id,
              title: `${constraint.type} = ${constraint.value}`,
              detail: "Filtro aplicado ao plano",
              remove: removeConstraintAction.bind(null, constraint.id, plan.id),
            }))}
          />
          <div className="mt-4">
            <ActionForm
              action={addConstraintAction.bind(null, plan.id)}
              submitLabel="Adicionar restrição"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipo">
                  <Input
                    name="type"
                    placeholder="exclude_segment / min_employees / region"
                  />
                </Field>
                <Field label="Valor">
                  <Textarea
                    name="value"
                    placeholder="ex: excluir consultorias sem e-mail direto ou priorizar empresas com 10+ funcionários"
                  />
                </Field>
              </div>
            </ActionForm>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function PlanPrimaryAction({
  planId,
  label,
  stage,
  companyIds,
}: {
  planId: string;
  label: string;
  stage: string;
  companyIds: string[];
}) {
  async function submitDiscovery(formData: FormData) {
    "use server";
    await runDiscoveryAction(planId, formData);
  }

  async function submitRefinement(formData: FormData) {
    "use server";
    await refineCompaniesAction(planId, formData);
  }

  if (stage === "icp") {
    return (
      <Link
        href="#icp"
        className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        {label}
      </Link>
    );
  }

  if (stage === "refinement") {
    return (
      <form action={submitRefinement}>
        {companyIds.map((companyId) => (
          <input
            key={companyId}
            type="hidden"
            name="companyId"
            value={companyId}
          />
        ))}
        <Button type="submit" disabled={companyIds.length === 0}>
          {label}
        </Button>
      </form>
    );
  }

  return (
    <form action={submitDiscovery}>
      <input type="hidden" name="requested" value="12" />
      <Button type="submit">{label}</Button>
    </form>
  );
}

function InlineList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{
    id: string;
    title: string;
    detail: string;
    remove: () => Promise<{ ok: boolean; message: string }>;
  }>;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {item.detail}
                </div>
              </div>
              <ActionButton
                action={item.remove}
                label="Remover"
                variant="ghost"
                size="sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
