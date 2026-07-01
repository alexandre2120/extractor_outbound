import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Field, Input, Badge } from "@repo/ui";
import { prisma } from "@repo/db";
import { ActionForm } from "@/components/action-form";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  updatePlanAction,
  addSegmentAction,
  addPersonaAction,
  addConstraintAction,
  removeSegmentAction,
  removePersonaAction,
  removeConstraintAction,
  setPlanLocationAction,
  runDiscoveryAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = { A: "solid", B: "default", C: "outline" };

export default async function PlanDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      markets: true,
      countries: true,
      segments: { orderBy: { label: "asc" } },
      personas: { orderBy: { role: "asc" } },
      constraints: { orderBy: { type: "asc" } },
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
  const discoveryActive = lastRun?.status === "PENDING" || lastRun?.status === "RUNNING";
  const currentCountry = plan.countries[0]?.countryCode ?? "";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link href="/plans" className="text-xs text-muted-foreground hover:text-foreground">← Plans</Link>
        <h1 className="text-xl font-semibold tracking-tight">{plan.name}</h1>
        <div className="flex gap-1">
          {plan.markets.map((m) => <Badge key={m.id} variant="outline">{m.market}</Badge>)}
          {plan.countries.map((c) => <Badge key={c.id} variant="outline">{c.countryCode}</Badge>)}
        </div>
      </div>

      <AutoRefresh active={!!discoveryActive} />

      {/* Descoberta de empresas */}
      <Card>
        <CardHeader><CardTitle>Descobrir empresas (com e-mail) + ranking IA</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionForm action={setPlanLocationAction.bind(null, plan.id)} submitLabel="Salvar país">
            <Field label="País do plano (define a busca)">
              <select
                name="country"
                defaultValue={currentCountry || "PT"}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="PT">Portugal (busca web + scraping de e-mail)</option>
                <option value="BR">Brasil (idem; CNPJá disponível à parte)</option>
              </select>
            </Field>
          </ActionForm>

          <ActionForm action={runDiscoveryAction.bind(null, plan.id)} submitLabel="Descobrir empresas">
            <Field label="Quantas empresas buscar (5–30)">
              <Input name="requested" type="number" defaultValue="12" />
            </Field>
          </ActionForm>

          {lastRun && (
            <div className="rounded-md bg-surface-muted p-3 text-xs text-muted-foreground">
              Última rodada: <strong>{lastRun.status}</strong>
              {lastRun.query ? ` · "${lastRun.query}"` : ""} · {lastRun.found} empresas · {lastRun.withEmail} com e-mail
              {lastRun.error ? ` · erro: ${lastRun.error}` : ""}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking da rodada */}
      {lastRun && lastRun.results.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Ranking ({lastRun.results.length} empresas)</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {lastRun.results.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex flex-col">
                  <Link href={`/companies/${r.company.id}`} className="text-sm font-medium hover:underline">
                    {r.company.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {r.company.domain ?? "—"}
                    {r.company.email ? ` · ${r.company.email}` : " · sem e-mail"}
                    {r.company.city ? ` · ${r.company.city}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {r.emailFound && <Badge variant="outline">e-mail</Badge>}
                  {r.tier && <Badge variant={(TIER_LABEL[r.tier] ?? "default") as "solid" | "default" | "outline"}>{r.tier}</Badge>}
                  <span className="text-sm font-semibold tabular-nums">{r.rankScore != null ? Math.round(r.rankScore) : "—"}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dados básicos */}
      <Card>
        <CardHeader><CardTitle>Dados do plano</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={updatePlanAction.bind(null, plan.id)} submitLabel="Salvar">
            <Field label="Nome"><Input name="name" defaultValue={plan.name} /></Field>
            <Field label="Objetivo comercial"><Input name="objective" defaultValue={plan.objective} /></Field>
            <Field label="Proposta de valor"><Input name="valueProp" defaultValue={plan.valueProp ?? ""} /></Field>
            <Field label="Tom"><Input name="tone" defaultValue={plan.tone ?? ""} /></Field>
          </ActionForm>
        </CardContent>
      </Card>

      {/* Segmentos */}
      <Card>
        <CardHeader><CardTitle>Segmentos-alvo</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {plan.segments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum segmento.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {plan.segments.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{s.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {[s.keywords && `kw: ${s.keywords}`, s.cnaeCodes && `CNAE: ${s.cnaeCodes}`].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                  <ActionButton action={removeSegmentAction.bind(null, s.id, plan.id)} label="Remover" variant="ghost" size="sm" />
                </div>
              ))}
            </div>
          )}
          <ActionForm action={addSegmentAction.bind(null, plan.id)} submitLabel="Adicionar segmento">
            <Field label="Segmento"><Input name="label" placeholder="Agências de marketing" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Palavras-chave"><Input name="keywords" placeholder="marketing,ads,growth" /></Field>
              <Field label="CNAEs"><Input name="cnaeCodes" placeholder="7311400" /></Field>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      {/* Personas */}
      <Card>
        <CardHeader><CardTitle>Personas</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {plan.personas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma persona.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {plan.personas.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{p.role}</span>
                    <span className="text-xs text-muted-foreground">
                      {[p.seniority, p.painPoints].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                  <ActionButton action={removePersonaAction.bind(null, p.id, plan.id)} label="Remover" variant="ghost" size="sm" />
                </div>
              ))}
            </div>
          )}
          <ActionForm action={addPersonaAction.bind(null, plan.id)} submitLabel="Adicionar persona">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cargo"><Input name="role" placeholder="Head de Growth" /></Field>
              <Field label="Senioridade"><Input name="seniority" placeholder="C-level/Head" /></Field>
            </div>
            <Field label="Dores"><Input name="painPoints" placeholder="CAC alto, prospecção manual" /></Field>
          </ActionForm>
        </CardContent>
      </Card>

      {/* Restrições */}
      <Card>
        <CardHeader><CardTitle>Restrições</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {plan.constraints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma restrição.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {plan.constraints.map((cst) => (
                <div key={cst.id} className="flex items-center justify-between py-2">
                  <span className="text-sm"><code>{cst.type}</code> = {cst.value}</span>
                  <ActionButton action={removeConstraintAction.bind(null, cst.id, plan.id)} label="Remover" variant="ghost" size="sm" />
                </div>
              ))}
            </div>
          )}
          <ActionForm action={addConstraintAction.bind(null, plan.id)} submitLabel="Adicionar restrição">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo"><Input name="type" placeholder="exclude_segment / min_employees / region" /></Field>
              <Field label="Valor"><Input name="value" placeholder="ex: 50" /></Field>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
