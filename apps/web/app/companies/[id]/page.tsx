import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, Input } from "@repo/ui";
import { prisma, TemplateSettingsStatus } from "@repo/db";
import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  AsyncNotice,
  PageHeader,
  ScoreBar,
  SectionCard,
  SectionTitle,
  StageStepper,
  StatusPill,
  TierBadge,
} from "@/components/flow-ui";
import { MessagePreviewCard } from "@/components/message-preview-card";
import { getCompanyPrimaryAction } from "@/lib/flow";
import { getWorkspace } from "@/lib/workspace";
import {
  approveEnrichmentAction,
  enrichCompanyAction,
  generateMessageAction,
  runResearchAction,
  sendMessageAction,
  setCompanyDomain,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function CompanyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getWorkspace();
  const company = await prisma.company.findFirst({
    where: { id, workspaceId: ws.id },
    include: {
      registryData: true,
      website: true,
      researchJobs: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { evidence: { take: 2, orderBy: { capturedAt: "desc" } } },
      },
      enrichments: { orderBy: { version: "desc" } },
      messages: {
        orderBy: { createdAt: "desc" },
        include: { events: true, campaign: true, step: true },
      },
      workspace: {
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
      },
      discoveryResults: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!company) notFound();

  const activeTemplateSettings = company.workspace.emailTemplateSettings[0] ?? null;
  const latestResult = company.discoveryResults[0] ?? null;
  const latestGenerated = company.enrichments.find(
    (enrichment) =>
      enrichment.status === "GENERATED" || enrichment.status === "REVIEWED",
  );
  const approvedEnrichment = company.enrichments.find(
    (enrichment) => enrichment.status === "APPROVED",
  );
  const jobActive =
    company.researchJobs.some(
      (job) => job.status === "PENDING" || job.status === "RUNNING",
    ) ||
    company.enrichments.some((enrichment) => enrichment.status === "DRAFT");
  const primary = getCompanyPrimaryAction({
    hasDomain: !!(company.domain || company.email),
    hasResearch: !!company.website?.factualSummary,
    hasGeneratedEnrichment: !!latestGenerated,
    hasApprovedEnrichment: !!approvedEnrichment,
    hasCampaignMessage: company.messages.some(
      (message) => !!message.campaignId,
    ),
  });

  return (
    <div className="flex flex-col gap-6">
      <StageStepper current={primary.stage} />

      <Link
        href="/companies"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Empresas
      </Link>

      <PageHeader
        eyebrow="Empresa"
        title={company.name}
        description={
          [company.domain, company.city, company.email]
            .filter(Boolean)
            .join(" · ") || "Sem domínio/e-mail cadastrado."
        }
        action={
          <CompanyPrimaryAction
            companyId={company.id}
            label={primary.label}
            generatedEnrichmentId={latestGenerated?.id ?? null}
          />
        }
      >
        <TierBadge tier={latestResult?.tier ?? null} size="md" />
        <StatusPill variant="outline">
          Score{" "}
          {latestResult?.rankScore != null
            ? Math.round(latestResult.rankScore)
            : "—"}
        </StatusPill>
        {company.email && <StatusPill>e-mail verificado</StatusPill>}
      </PageHeader>

      <AutoRefresh active={jobActive} />
      {jobActive && (
        <AsyncNotice
          title="Refino em andamento..."
          description="Research ou IA estão na fila. A página atualiza sozinha."
        />
      )}

      <SectionCard>
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_240px]">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Fit da última rodada
            </div>
            <ScoreBar
              value={
                latestResult?.rankScore ?? approvedEnrichment?.fitScore ?? null
              }
            />
          </div>
          <ActionForm
            action={setCompanyDomain.bind(null, company.id)}
            submitLabel="Salvar domínio"
          >
            <Field label="Domínio / site">
              <Input
                name="domain"
                defaultValue={company.domain ?? ""}
                placeholder="empresa.com.br"
              />
            </Field>
          </ActionForm>
        </div>
      </SectionCard>

      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Camadas de verdade
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <TruthLayerCard
            title="Registro"
            icon="R"
            status={company.registryData ? "Confirmado" : "Pendente"}
            fit={company.registryData ? 80 : null}
            angle={
              company.registryData
                ? `CNAE ${company.registryData.cnae ?? "—"} · status ${company.registryData.status ?? "—"}`
                : "Sem dados cadastrais estruturados para esta empresa."
            }
          />
          <TruthLayerCard
            title="Website"
            icon="W"
            status={company.website?.factualSummary ? "Lido" : "Pendente"}
            fit={company.researchJobs[0]?.qualityScore ?? null}
            angle={
              company.website?.factualSummary ??
              "Rode “Pesquisar site” para registrar fatos públicos e evidências."
            }
          />
          <TruthLayerCard
            title="IA"
            icon="IA"
            status={
              approvedEnrichment
                ? "Aprovado"
                : latestGenerated
                  ? "Gerado"
                  : "Pendente"
            }
            fit={
              approvedEnrichment?.fitScore ?? latestGenerated?.fitScore ?? null
            }
            angle={
              approvedEnrichment?.approachAngle ??
              latestGenerated?.approachAngle ??
              "Enriqueça para gerar fit, hipóteses e ângulo de abordagem."
            }
          />
        </div>
      </div>

      <SectionCard>
        <SectionTitle
          title="Enrichments"
          description="Inferência comercial derivada das camadas cadastral e website."
          action={
            <ActionButton
              action={enrichCompanyAction.bind(null, company.id)}
              label="Enriquecer (IA)"
              pendingLabel="gerando..."
            />
          }
        />
        <div className="divide-y divide-border">
          {company.enrichments.length === 0 ? (
            <p className="px-5 py-5 text-sm text-muted-foreground">
              Nenhum enrichment ainda.
            </p>
          ) : (
            company.enrichments.map((enrichment) => (
              <div key={enrichment.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        v{enrichment.version}
                      </span>
                      <StatusPill
                        variant={
                          enrichment.status === "APPROVED" ? "solid" : "default"
                        }
                      >
                        {enrichment.status}
                      </StatusPill>
                      {enrichment.fitScore != null && (
                        <StatusPill variant="outline">
                          fit {Math.round(enrichment.fitScore)}
                        </StatusPill>
                      )}
                    </div>
                    {enrichment.approachAngle && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {enrichment.approachAngle}
                      </p>
                    )}
                    {Array.isArray(enrichment.hypotheses) && (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                        {(enrichment.hypotheses as string[])
                          .slice(0, 3)
                          .map((hypothesis, index) => (
                            <li key={index}>{hypothesis}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                  {enrichment.status === "GENERATED" && (
                    <ActionButton
                      action={approveEnrichmentAction.bind(
                        null,
                        enrichment.id,
                        company.id,
                      )}
                      label="Aprovar"
                      size="sm"
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle
          title="Mensagens"
          description="Rascunhos, envio via Brevo e eventos de entrega."
          action={
            <ActionButton
              action={generateMessageAction.bind(null, company.id)}
              label="Gerar mensagem"
              pendingLabel="gerando..."
              variant={approvedEnrichment ? "default" : "outline"}
            />
          }
        />
        <div className="divide-y divide-border">
          {company.messages.length === 0 ? (
            <p className="px-5 py-5 text-sm text-muted-foreground">
              Nenhuma mensagem gerada.
            </p>
          ) : (
            company.messages.map((message) => (
              <MessagePreviewCard
                key={message.id}
                subject={message.subject}
                body={message.body}
                companyName={company.name}
                campaignName={message.campaign?.name}
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
                        company.id,
                      )}
                      label="Enviar"
                      size="sm"
                      pendingLabel="enviando..."
                    />
                  ) : null
                }
              />
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function CompanyPrimaryAction({
  companyId,
  label,
  generatedEnrichmentId,
}: {
  companyId: string;
  label: string;
  generatedEnrichmentId: string | null;
}) {
  if (label === "Pesquisar site") {
    return (
      <ActionButton
        action={runResearchAction.bind(null, companyId)}
        label={label}
        pendingLabel="enfileirando..."
        variant="default"
      />
    );
  }

  if (label === "Enriquecer (IA)") {
    return (
      <ActionButton
        action={enrichCompanyAction.bind(null, companyId)}
        label={label}
        pendingLabel="gerando..."
        variant="default"
      />
    );
  }

  if (label === "Aprovar" && generatedEnrichmentId) {
    return (
      <ActionButton
        action={approveEnrichmentAction.bind(
          null,
          generatedEnrichmentId,
          companyId,
        )}
        label={label}
        variant="default"
      />
    );
  }

  return (
    <Link
      href="/campaigns"
      className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
    >
      {label}
    </Link>
  );
}

function TruthLayerCard({
  icon,
  title,
  status,
  fit,
  angle,
}: {
  icon: string;
  title: string;
  status: string;
  fit: number | null;
  angle: string;
}) {
  return (
    <SectionCard className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-surface-muted px-1.5 font-mono text-xs font-semibold">
            {icon}
          </span>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <StatusPill variant={status === "Pendente" ? "outline" : "default"}>
          {status}
        </StatusPill>
      </div>
      <div className="mb-3">
        <ScoreBar value={fit} />
      </div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Ângulo
      </div>
      <p className="line-clamp-5 text-sm leading-6 text-muted-foreground">
        {angle}
      </p>
    </SectionCard>
  );
}
