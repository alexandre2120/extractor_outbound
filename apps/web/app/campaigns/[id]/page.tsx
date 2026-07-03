import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, Input, Textarea } from "@repo/ui";
import { prisma, TemplateSettingsStatus } from "@repo/db";
import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  SectionTitle,
  StageStepper,
  StatusPill,
} from "@/components/flow-ui";
import { MessagePreviewCard } from "@/components/message-preview-card";
import { getCampaignPrimaryAction } from "@/lib/flow";
import { getWorkspace } from "@/lib/workspace";
import {
  getSelectedCompanyIds,
  type SearchParamsLike,
} from "@/lib/campaign-selection";
import {
  getSelectedCompanyPrepIds,
  getSelectedCompanyReadiness,
} from "@/lib/selected-companies";
import {
  addStepAction,
  approveEnrichmentAction,
  enrichCompanyAction,
  generateSequenceForCompanyAction,
  prepareSelectedCompaniesAction,
  removeStepAction,
  runResearchAction,
  sendMessageAction,
  setCampaignStatusAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function CampaignDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParamsLike>;
}) {
  const { id } = await params;
  const selectedCompanyIds = getSelectedCompanyIds((await searchParams) ?? {});
  const ws = await getWorkspace();
  const [campaign, selectedCompanies, workspace] = await Promise.all([
    prisma.outboundCampaign.findFirst({
      where: { id, workspaceId: ws.id },
      include: {
        plan: true,
        steps: { orderBy: { order: "asc" } },
        messages: {
          orderBy: [{ createdAt: "asc" }],
          include: { company: true, events: true, step: true },
        },
      },
    }),
    selectedCompanyIds.length
      ? prisma.company.findMany({
          where: { id: { in: selectedCompanyIds }, workspaceId: ws.id },
          orderBy: { name: "asc" },
          include: {
            website: true,
            researchJobs: { orderBy: { createdAt: "desc" }, take: 3 },
            enrichments: { orderBy: { version: "desc" }, take: 3 },
          },
        })
      : Promise.resolve([]),
    prisma.workspace.findUnique({
      where: { id: ws.id },
      include: {
        emailTemplateSettings: {
          where: {
            status: TemplateSettingsStatus.APPROVED,
            isActive: true,
          },
          orderBy: { approvedAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);
  if (!campaign) notFound();
  const activeTemplateSettings = workspace?.emailTemplateSettings[0] ?? null;

  const eligible = await prisma.company.findMany({
    where: {
      workspaceId: ws.id,
      enrichments: { some: { status: "APPROVED" } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, domain: true, email: true },
  });
  const selectedCompanyInputs = selectedCompanies.map((company) => ({
    id: company.id,
    name: company.name,
    domain: company.domain,
    email: company.email,
    websiteSummary: company.website?.factualSummary ?? null,
    researchStatuses: company.researchJobs.map((job) => job.status),
    enrichmentStatuses: company.enrichments.map(
      (enrichment) => enrichment.status,
    ),
  }));
  const selectedReadiness = getSelectedCompanyReadiness(selectedCompanyInputs);
  const selectedPrepIds = getSelectedCompanyPrepIds(selectedCompanyInputs);
  const selectedReadyIds = new Set(selectedReadiness.ready);
  const selectedApprovalIds = new Set(selectedReadiness.needsApproval);
  const selectedEnrichmentIds = new Set(selectedReadiness.needsEnrichment);
  const selectedResearchIds = new Set(selectedReadiness.needsResearch);
  const selectedBlockedIds = new Set(selectedReadiness.blocked);
  const selectedPendingCount = selectedCompanies.length - selectedReadyIds.size;
  const selectedCanPrepareCount =
    selectedPrepIds.approveIds.length +
    selectedPrepIds.enrichIds.length +
    selectedPrepIds.researchIds.length;
  const selectedNeedApprovalCount = selectedPrepIds.approveIds.length;
  const selectedNeedEnrichmentCount = selectedPrepIds.enrichIds.length;
  const selectedNeedResearchCount = selectedPrepIds.researchIds.length;
  const selectedBlockedCount = selectedReadiness.blocked.length;
  const selectedStatusSummary = [
    `${selectedReadyIds.size} pronta(s)`,
    selectedNeedApprovalCount
      ? `${selectedNeedApprovalCount} para aprovar`
      : null,
    selectedNeedEnrichmentCount
      ? `${selectedNeedEnrichmentCount} para enriquecer`
      : null,
    selectedNeedResearchCount
      ? `${selectedNeedResearchCount} para pesquisar`
      : null,
    selectedBlockedCount ? `${selectedBlockedCount} aguardando dados` : null,
  ].filter(Boolean);
  const selectedActionIds = Array.from(
    new Set([
      ...selectedPrepIds.approveIds,
      ...selectedPrepIds.enrichIds,
      ...selectedPrepIds.researchIds,
    ]),
  );
  const sortedEligible = eligible.slice().sort((a, b) => {
    const aSelected = selectedReadyIds.has(a.id);
    const bSelected = selectedReadyIds.has(b.id);
    if (aSelected === bSelected) return a.name.localeCompare(b.name);
    return aSelected ? -1 : 1;
  });
  const primary = getCampaignPrimaryAction({
    stepCount: campaign.steps.length,
    messageCount: campaign.messages.length,
    hasDraftMessages: campaign.messages.some(
      (message) => message.status !== "SENT",
    ),
  });

  return (
    <div className="flex flex-col gap-6">
      <StageStepper current={primary.stage} />

      <Link
        href="/campaigns"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Campanhas
      </Link>

      <PageHeader
        eyebrow="Campanha"
        title={campaign.name}
        description={`${campaign.steps.length} passos · ${campaign.messages.length} mensagens · plano ${campaign.plan?.name ?? "—"}`}
        action={
          <CampaignPrimaryAction
            label={primary.label}
            stepCount={campaign.steps.length}
          />
        }
      >
        <StatusPill
          variant={campaign.status === "ACTIVE" ? "solid" : "outline"}
        >
          {campaign.status}
        </StatusPill>
        {campaign.status !== "ACTIVE" ? (
          <ActionButton
            action={setCampaignStatusAction.bind(null, campaign.id, "ACTIVE")}
            label="Ativar"
            size="sm"
          />
        ) : (
          <ActionButton
            action={setCampaignStatusAction.bind(null, campaign.id, "PAUSED")}
            label="Pausar"
            size="sm"
            variant="outline"
          />
        )}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:items-start">
        <SectionCard>
          <SectionTitle
            title="Sequência"
            description="Ordem e objetivo de cada toque."
          />
          <div className="p-5">
            {campaign.steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum passo. Adicione ao menos um.
              </p>
            ) : (
              <div className="flex flex-col">
                {campaign.steps.map((step, index) => (
                  <div key={step.id} className="flex gap-3 pb-5 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground font-mono text-xs font-semibold text-background">
                        {step.order}
                      </div>
                      {index < campaign.steps.length - 1 && (
                        <div className="mt-1 min-h-8 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="font-mono text-[11px] text-muted-foreground">
                        Dia {step.delayDays}
                      </div>
                      <div className="mt-0.5 text-sm font-semibold">
                        {step.template ?? "Sem objetivo"}
                      </div>
                      <div className="mt-2">
                        <ActionButton
                          action={removeStepAction.bind(
                            null,
                            step.id,
                            campaign.id,
                          )}
                          label="Remover"
                          variant="ghost"
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div id="add-step" className="mt-5 border-t border-border pt-5">
              <ActionForm
                action={addStepAction.bind(null, campaign.id)}
                submitLabel="Adicionar passo"
              >
                <Field label="Objetivo do passo">
                  <Textarea
                    name="template"
                    placeholder="Prova de valor com exemplo concreto"
                  />
                </Field>
                <Field label="Dia (delay)">
                  <Input name="delayDays" type="number" defaultValue="0" />
                </Field>
              </ActionForm>
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-col gap-4">
          {selectedCompanies.length > 0 && (
            <SectionCard>
              <SectionTitle
                title="Selecionadas do ranking"
                description={selectedStatusSummary.join(" · ")}
              />
              <div className="flex flex-col gap-4 p-5">
                {selectedCanPrepareCount > 0 && (
                  <div className="rounded-md border border-border bg-surface-muted/50 p-4">
                    <div className="mb-3 text-sm font-medium">
                      Próximo passo: preparar as empresas selecionadas.
                    </div>
                    <ActionForm
                      action={prepareSelectedCompaniesAction.bind(
                        null,
                        campaign.id,
                      )}
                      submitLabel={`Preparar ${selectedCanPrepareCount} selecionada(s)`}
                    >
                      {selectedActionIds.map((companyId) => (
                        <input
                          key={companyId}
                          type="hidden"
                          name="companyId"
                          value={companyId}
                        />
                      ))}
                    </ActionForm>
                  </div>
                )}

                <div className="divide-y divide-border rounded-md border border-border">
                  {selectedCompanies.map((company) => {
                    const generatedEnrichment = company.enrichments.find(
                      (enrichment) =>
                        enrichment.status === "GENERATED" ||
                        enrichment.status === "REVIEWED",
                    );
                    const isReady = selectedReadyIds.has(company.id);
                    const needsApproval = selectedApprovalIds.has(company.id);
                    const needsEnrichment = selectedEnrichmentIds.has(
                      company.id,
                    );
                    const needsResearch = selectedResearchIds.has(company.id);
                    const isBlocked = selectedBlockedIds.has(company.id);

                    return (
                      <div
                        key={company.id}
                        className="flex flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/companies/${company.id}`}
                            className="line-clamp-1 text-sm font-medium hover:underline"
                          >
                            {company.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {isReady && (
                              <StatusPill variant="solid">pronta</StatusPill>
                            )}
                            {needsApproval && (
                              <StatusPill>aguarda aprovação</StatusPill>
                            )}
                            {needsEnrichment && (
                              <StatusPill>precisa enrichment</StatusPill>
                            )}
                            {needsResearch && (
                              <StatusPill>precisa research</StatusPill>
                            )}
                            {isBlocked && (
                              <StatusPill variant="outline">
                                em andamento ou sem domínio
                              </StatusPill>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          {needsApproval && generatedEnrichment ? (
                            <ActionButton
                              action={approveEnrichmentAction.bind(
                                null,
                                generatedEnrichment.id,
                                company.id,
                              )}
                              label="Aprovar"
                              size="sm"
                            />
                          ) : null}
                          {needsEnrichment && (
                            <ActionButton
                              action={enrichCompanyAction.bind(
                                null,
                                company.id,
                              )}
                              label="Enriquecer"
                              size="sm"
                              pendingLabel="gerando..."
                              variant="outline"
                            />
                          )}
                          {needsResearch && (
                            <ActionButton
                              action={runResearchAction.bind(null, company.id)}
                              label="Pesquisar site"
                              size="sm"
                              pendingLabel="enfileirando..."
                              variant="outline"
                            />
                          )}
                          {isReady && (
                            <span className="text-xs text-muted-foreground">
                              Já entra marcada abaixo.
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          )}

          <SectionCard id="generate-sequence">
            <SectionTitle
              title="Gerar sequência"
              description="Escolha empresas aprovadas e gere mensagens por passo."
            />
            <div className="p-5">
              {eligible.length === 0 ? (
                <EmptyState
                  title="Nenhuma empresa aprovada"
                  description="Aprove um enrichment em uma empresa antes de gerar uma sequência."
                  actionHref="/companies"
                  actionLabel="Ver empresas"
                />
              ) : (
                <ActionForm
                  action={generateSequenceForCompanyAction.bind(
                    null,
                    campaign.id,
                  )}
                  submitLabel="Gerar sequência"
                >
                  <Field label="Empresas com enrichment aprovado">
                    <div className="max-h-72 overflow-auto rounded-md border border-border">
                      {sortedEligible.map((company) => (
                        <label
                          key={company.id}
                          className="flex cursor-pointer items-start gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-surface-muted"
                        >
                          <input
                            type="checkbox"
                            name="companyId"
                            value={company.id}
                            defaultChecked={selectedReadyIds.has(company.id)}
                            className="mt-0.5 h-4 w-4 accent-foreground"
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="text-sm font-medium">
                              {company.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {[company.email, company.domain]
                                .filter(Boolean)
                                .join(" · ") || "sem e-mail/domínio"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </Field>
                </ActionForm>
              )}
            </div>
          </SectionCard>

          <SectionCard id="messages">
            <SectionTitle
              title="Mensagens por empresa"
              description="Rascunhos, status e eventos capturados."
            />
            {campaign.messages.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="Nenhuma mensagem gerada"
                  description="Gere uma sequência para criar os rascunhos por empresa e passo."
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {campaign.messages.map((message) => (
                  <MessagePreviewCard
                    key={message.id}
                    subject={message.subject}
                    body={message.body}
                    companyName={message.company.name}
                    companyHref={`/companies/${message.companyId}`}
                    campaignName={campaign.name}
                    stepOrder={message.step?.order}
                    status={message.status}
                    events={message.events}
                    settings={activeTemplateSettings}
                    action={
                      message.status !== "SENT" ? (
                        <ActionButton
                          action={sendMessageAction.bind(
                            null,
                            message.id,
                            message.companyId,
                          )}
                          label="Enviar"
                          size="sm"
                          pendingLabel="enviando..."
                        />
                      ) : null
                    }
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function CampaignPrimaryAction({
  label,
  stepCount,
}: {
  label: string;
  stepCount: number;
}) {
  const href = stepCount === 0 ? "#add-step" : "#generate-sequence";
  const finalHref =
    label === "Revisar e enviar" || label === "Acompanhar eventos"
      ? "#messages"
      : href;

  return (
    <Link
      href={finalHref}
      className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
    >
      {label}
    </Link>
  );
}
