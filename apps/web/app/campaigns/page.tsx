import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Badge } from "@repo/ui";
import { prisma } from "@repo/db";
import { ActionForm } from "@/components/action-form";
import { createCampaignAction } from "@/lib/actions";
import { getWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const ws = await getWorkspace();
  const campaigns = await prisma.outboundCampaign.findMany({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { steps: true, messages: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Sequências multi-step. Mensagens geradas por passo a partir de Plan +
          Company + AIEnrichment, enviadas via Brevo com tracking de eventos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova campanha</CardTitle>
          <CardDescription>Vinculada ao seu plano mais recente.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={createCampaignAction} submitLabel="Criar campanha">
            <Field label="Nome"><Input name="name" placeholder="Outbound agências — Q3" required /></Field>
          </ActionForm>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Campanhas ({campaigns.length})</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma campanha ainda.</p>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {campaigns.map((c) => (
                <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-surface-muted">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c._count.steps} passo(s) · {c._count.messages} mensagem(ns)
                    </span>
                  </div>
                  <Badge variant={c.status === "ACTIVE" ? "solid" : "outline"}>{c.status}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
