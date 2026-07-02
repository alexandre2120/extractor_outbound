import Link from "next/link";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from "@repo/ui";
import { prisma } from "@repo/db";
import { ActionForm } from "@/components/action-form";
import { createCampaignAction } from "@/lib/actions";
import {
  buildCampaignSelectionHref,
  getSelectedCompanyIds,
  getSelectedPlanId,
  type SearchParamsLike,
} from "@/lib/campaign-selection";
import { getWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsLike>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedCompanyIds = getSelectedCompanyIds(resolvedSearchParams);
  const selectedPlanId = getSelectedPlanId(resolvedSearchParams);
  const ws = await getWorkspace();
  const [campaigns, selectedCompanies] = await Promise.all([
    prisma.outboundCampaign.findMany({
      where: { workspaceId: ws.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { steps: true, messages: true } } },
    }),
    selectedCompanyIds.length
      ? prisma.company.findMany({
          where: { id: { in: selectedCompanyIds }, workspaceId: ws.id },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true, domain: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Campanhas</h1>
        <p className="text-sm text-muted-foreground">
          Sequências multi-step. Mensagens geradas por passo a partir de Plan +
          Company + AIEnrichment, enviadas via Brevo com tracking de eventos.
        </p>
      </div>

      {selectedCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Empresas selecionadas</CardTitle>
            <CardDescription>
              Elas serão levadas para a campanha que você criar ou abrir agora.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {selectedCompanies.map((company) => (
              <Badge key={company.id} variant="default">
                {company.name}
                {company.email ? ` · ${company.email}` : ""}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nova campanha</CardTitle>
          <CardDescription>
            Vinculada ao seu plano mais recente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={createCampaignAction}
            submitLabel={
              selectedCompanyIds.length > 0
                ? "Criar campanha com selecionadas"
                : "Criar campanha"
            }
          >
            <Field label="Nome">
              <Input
                name="name"
                placeholder="Outbound agências — Q3"
                required
              />
            </Field>
            {selectedCompanyIds.map((companyId) => (
              <input
                key={companyId}
                type="hidden"
                name="companyId"
                value={companyId}
              />
            ))}
            {selectedPlanId && (
              <input type="hidden" name="planId" value={selectedPlanId} />
            )}
          </ActionForm>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Campanhas ({campaigns.length})
        </h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma campanha ainda.
          </p>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={buildCampaignSelectionHref(
                    `/campaigns/${campaign.id}`,
                    selectedCompanyIds,
                    selectedPlanId,
                  )}
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-muted"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{campaign.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {campaign._count.steps} passo(s) ·{" "}
                      {campaign._count.messages} mensagem(ns)
                    </span>
                  </div>
                  <Badge
                    variant={campaign.status === "ACTIVE" ? "solid" : "outline"}
                  >
                    {campaign.status}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
