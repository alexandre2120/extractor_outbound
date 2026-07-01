import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Field, Input, Badge } from "@repo/ui";
import { prisma } from "@repo/db";
import { ActionForm } from "@/components/action-form";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  setCompanyDomain,
  runResearchAction,
  enrichCompanyAction,
  approveEnrichmentAction,
  generateMessageAction,
  sendMessageAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.company.findUnique({
    where: { id },
    include: {
      registryData: true,
      website: true,
      researchJobs: { orderBy: { createdAt: "desc" }, take: 3 },
      enrichments: { orderBy: { version: "desc" } },
      messages: { orderBy: { createdAt: "desc" }, include: { events: true } },
    },
  });
  if (!c) notFound();

  const approvedEnrichment = c.enrichments.find((e) => e.status === "APPROVED");
  const jobActive =
    c.researchJobs.some((j) => j.status === "PENDING" || j.status === "RUNNING") ||
    c.enrichments.some((e) => e.status === "DRAFT");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link href="/companies" className="text-xs text-muted-foreground hover:text-foreground">← Companies</Link>
        <h1 className="text-xl font-semibold tracking-tight">{c.name}</h1>
        <p className="text-sm text-muted-foreground">
          {c.taxId} · {c.registryData?.status ?? "—"} · {c.city ?? "?"}/{c.state ?? "?"}
        </p>
      </div>

      <AutoRefresh active={jobActive} />

      {/* Registry — verdade estruturada */}
      <Card>
        <CardHeader><CardTitle>Registry <Badge variant="outline">verdade estruturada</Badge></CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">CNAE:</span> {c.registryData?.cnae ?? "—"}</div>
          <div><span className="text-muted-foreground">E-mail:</span> {c.email ?? "—"}</div>
          <div><span className="text-muted-foreground">Telefone:</span> {c.phone ?? "—"}</div>
          <div><span className="text-muted-foreground">Razão social:</span> {c.legalName ?? "—"}</div>
        </CardContent>
      </Card>

      {/* Website + research */}
      <Card>
        <CardHeader><CardTitle>Browser research <Badge variant="outline">website</Badge></CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionForm action={setCompanyDomain.bind(null, c.id)} submitLabel="Salvar domínio">
            <Field label="Domínio / site">
              <Input name="domain" defaultValue={c.domain ?? ""} placeholder="empresa.com.br" />
            </Field>
          </ActionForm>
          <div className="flex items-center gap-3">
            <ActionButton action={runResearchAction.bind(null, c.id)} label="Rodar research" pendingLabel="enfileirando..." />
            {c.researchJobs[0] && (
              <Badge variant={c.researchJobs[0].status === "DONE" ? "solid" : "outline"}>
                {c.researchJobs[0].status}
                {c.researchJobs[0].qualityScore != null ? ` · score ${c.researchJobs[0].qualityScore}` : ""}
              </Badge>
            )}
          </div>
          {c.website?.factualSummary && (
            <div className="rounded-md bg-surface-muted p-3 text-xs text-muted-foreground">
              <div className="mb-1 font-medium text-foreground">Resumo factual (score {c.researchJobs[0]?.qualityScore ?? "?"})</div>
              {c.website.factualSummary.slice(0, 600)}…
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI enrichment */}
      <Card>
        <CardHeader><CardTitle>AI enrichment <Badge variant="outline">inferência</Badge></CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionButton action={enrichCompanyAction.bind(null, c.id)} label="Gerar enrichment (KIE)" pendingLabel="gerando..." />
          {c.enrichments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum enrichment. Rode research antes para melhor qualidade.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {c.enrichments.map((e) => (
                <div key={e.id} className="rounded-md border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      v{e.version}{e.fitScore != null ? ` · fit ${e.fitScore}` : ""}
                    </span>
                    <Badge variant={e.status === "APPROVED" ? "solid" : "default"}>
                      {e.status === "DRAFT" ? "na fila…" : e.status}
                    </Badge>
                  </div>
                  {e.approachAngle && (
                    <p className="mb-2 text-xs text-muted-foreground"><strong>Ângulo:</strong> {e.approachAngle}</p>
                  )}
                  {Array.isArray(e.hypotheses) && (
                    <ul className="mb-2 list-disc pl-4 text-xs text-muted-foreground">
                      {(e.hypotheses as string[]).slice(0, 3).map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  )}
                  {e.status === "GENERATED" && (
                    <ActionButton action={approveEnrichmentAction.bind(null, e.id, c.id)} label="Aprovar" size="sm" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mensagens */}
      <Card>
        <CardHeader><CardTitle>Mensagens & envio</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionButton
            action={generateMessageAction.bind(null, c.id)}
            label="Gerar mensagem (KIE)"
            pendingLabel="gerando..."
            variant={approvedEnrichment ? "default" : "outline"}
          />
          {!approvedEnrichment && (
            <p className="text-xs text-muted-foreground">Aprove um enrichment para gerar mensagem.</p>
          )}
          {c.messages.map((m) => (
            <div key={m.id} className="rounded-md border border-border p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">{m.subject ?? "(sem assunto)"}</span>
                <Badge variant={m.status === "SENT" ? "solid" : "default"}>{m.status}</Badge>
              </div>
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">{m.body}</p>
              <div className="mt-2 flex items-center gap-2">
                {m.status !== "SENT" && (
                  <ActionButton action={sendMessageAction.bind(null, m.id, c.id)} label="Enviar (Brevo)" size="sm" pendingLabel="enviando..." />
                )}
                {m.events.length > 0 && (
                  <span className="text-xs text-muted-foreground">{m.events.length} evento(s)</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
