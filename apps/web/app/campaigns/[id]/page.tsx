import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Field, Input, Badge } from "@repo/ui";
import { prisma } from "@repo/db";
import { getWorkspace } from "@/lib/workspace";
import { ActionForm } from "@/components/action-form";
import { ActionButton } from "@/components/action-button";
import {
  addStepAction,
  removeStepAction,
  generateSequenceForCompanyAction,
  setCampaignStatusAction,
  sendMessageAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await getWorkspace();
  const campaign = await prisma.outboundCampaign.findUnique({
    where: { id },
    include: {
      plan: true,
      steps: { orderBy: { order: "asc" } },
      messages: { orderBy: { createdAt: "asc" }, include: { company: true, events: true, step: true } },
    },
  });
  if (!campaign) notFound();

  // Empresas elegíveis: têm enrichment aprovado.
  const eligible = await prisma.company.findMany({
    where: { workspaceId: ws.id, enrichments: { some: { status: "APPROVED" } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link href="/campaigns" className="text-xs text-muted-foreground hover:text-foreground">← Campaigns</Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{campaign.name}</h1>
          <Badge variant={campaign.status === "ACTIVE" ? "solid" : "outline"}>{campaign.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Plano: {campaign.plan?.name ?? "—"}</p>
        <div className="mt-2 flex gap-2">
          {campaign.status !== "ACTIVE" && (
            <ActionButton action={setCampaignStatusAction.bind(null, campaign.id, "ACTIVE")} label="Ativar" size="sm" />
          )}
          {campaign.status === "ACTIVE" && (
            <ActionButton action={setCampaignStatusAction.bind(null, campaign.id, "PAUSED")} label="Pausar" size="sm" variant="outline" />
          )}
        </div>
      </div>

      {/* Passos da sequência */}
      <Card>
        <CardHeader><CardTitle>Sequência ({campaign.steps.length} passos)</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {campaign.steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum passo. Adicione ao menos um.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {campaign.steps.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Passo {s.order} · dia {s.delayDays}</span>
                    <span className="text-xs text-muted-foreground">{s.template}</span>
                  </div>
                  <ActionButton action={removeStepAction.bind(null, s.id, campaign.id)} label="Remover" variant="ghost" size="sm" />
                </div>
              ))}
            </div>
          )}
          <ActionForm action={addStepAction.bind(null, campaign.id)} submitLabel="Adicionar passo">
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <Field label="Objetivo do passo"><Input name="template" placeholder="Intro: dor de prospecção manual" /></Field>
              <Field label="Dia (delay)"><Input name="delayDays" type="number" defaultValue="0" /></Field>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      {/* Gerar sequência para empresa */}
      <Card>
        <CardHeader><CardTitle>Gerar sequência para empresa</CardTitle></CardHeader>
        <CardContent>
          {eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa com enrichment aprovado. Aprove um enrichment em Companies primeiro.
            </p>
          ) : (
            <ActionForm action={generateSequenceForCompanyAction.bind(null, campaign.id)} submitLabel="Gerar sequência (KIE)">
              <Field label="Empresa (com enrichment aprovado)">
                <select
                  name="companyId"
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {eligible.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      {/* Mensagens geradas */}
      <Card>
        <CardHeader><CardTitle>Mensagens ({campaign.messages.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {campaign.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem gerada.</p>
          ) : (
            campaign.messages.map((m) => (
              <div key={m.id} className="rounded-md border border-border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {m.company.name} · passo {m.step?.order ?? "?"} — {m.subject ?? "(sem assunto)"}
                  </span>
                  <Badge variant={m.status === "SENT" ? "solid" : "default"}>{m.status}</Badge>
                </div>
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">{m.body}</p>
                <div className="mt-2 flex items-center gap-3">
                  {m.status !== "SENT" && (
                    <ActionButton action={sendMessageAction.bind(null, m.id, m.companyId)} label="Enviar (Brevo)" size="sm" pendingLabel="enviando..." />
                  )}
                  {m.events.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      eventos: {m.events.map((e) => e.type.toLowerCase()).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
