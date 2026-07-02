import Link from "next/link";
import { prisma } from "@repo/db";
import { getPlanPrimaryAction } from "@/lib/flow";
import { getWorkspace } from "@/lib/workspace";
import {
  EmptyState,
  KpiCard,
  PageHeader,
  SectionCard,
  StageStepper,
} from "@/components/flow-ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ws = await getWorkspace();
  const plan = await prisma.plan.findFirst({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: "desc" },
    include: {
      countries: true,
      markets: true,
      segments: true,
      discoveryRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { results: true },
      },
    },
  });

  if (!plan) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Painel"
          description="Comece criando um plano. Ele vira o objeto central para descoberta, ranking, refino e campanhas."
        />
        <EmptyState
          title="Nenhum plano ainda"
          description="Crie um ICP inicial para liberar a jornada guiada de outbound."
          actionHref="/plans"
          actionLabel="Criar plano"
        />
      </div>
    );
  }

  const lastRun = plan.discoveryRuns[0] ?? null;
  const discoveryActive =
    lastRun?.status === "PENDING" || lastRun?.status === "RUNNING";
  const primary = getPlanPrimaryAction({
    hasCountry: plan.countries.length > 0,
    segmentCount: plan.segments.length,
    hasDiscoveryRun: !!lastRun,
    discoveryActive,
    hasResults: (lastRun?.results.length ?? 0) > 0,
  });

  const [companies, withEmail, approved, campaigns, sent] = await Promise.all([
    prisma.company.count({ where: { workspaceId: ws.id } }),
    prisma.company.count({
      where: { workspaceId: ws.id, email: { not: null } },
    }),
    prisma.company.count({
      where: {
        workspaceId: ws.id,
        enrichments: { some: { status: "APPROVED" } },
      },
    }),
    prisma.outboundCampaign.count({
      where: { workspaceId: ws.id, status: { in: ["DRAFT", "ACTIVE"] } },
    }),
    prisma.generatedMessage.count({
      where: { company: { workspaceId: ws.id }, status: "SENT" },
    }),
  ]);

  const pipeline = [
    { label: "Descobertas", value: companies },
    { label: "Com e-mail", value: withEmail },
    { label: "Aprovadas", value: approved },
    { label: "Campanhas", value: campaigns },
    { label: "Enviadas", value: sent },
  ];
  const max = Math.max(1, companies);

  return (
    <div className="flex flex-col gap-6">
      <StageStepper current={primary.stage} />

      <PageHeader
        eyebrow="Painel"
        title={plan.name}
        description="Seu plano ativo e a próxima ação para avançar o outbound sem escolher entre dez botões."
        action={
          <Link
            href={`/plans/${plan.id}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Continuar → {primary.label}
          </Link>
        }
      />

      <section className="rounded-xl bg-foreground p-6 text-background">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-background/55">
              Próxima ação
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              {primary.label}
            </h2>
            <p className="mt-1 text-sm text-background/65">
              {primary.stage === "refinement"
                ? `${lastRun?.results.length ?? 0} empresas aguardam refino antes da campanha.`
                : "Complete o passo atual para manter a sequência guiada."}
            </p>
          </div>
          <Link
            href={`/plans/${plan.id}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
          >
            Abrir plano
          </Link>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-5">
        <KpiCard label="Descobertas" value={companies} />
        <KpiCard label="Com e-mail" value={withEmail} />
        <KpiCard label="Aprovadas" value={approved} />
        <KpiCard label="Campanhas" value={campaigns} />
        <KpiCard label="Enviadas" value={sent} />
      </div>

      <SectionCard>
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold">Pipeline</h2>
          <div className="mt-4 flex flex-col gap-3">
            {pipeline.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[130px_1fr_44px] items-center gap-3"
              >
                <div className="text-sm text-foreground/80">{item.label}</div>
                <div className="h-6 overflow-hidden rounded-md bg-surface-muted">
                  <div
                    className="h-full rounded-md bg-foreground"
                    style={{
                      width: `${Math.max(4, Math.round((Number(item.value) / max) * 100))}%`,
                    }}
                  />
                </div>
                <div className="text-right font-mono text-sm font-medium tabular-nums">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
