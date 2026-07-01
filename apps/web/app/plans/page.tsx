import { Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Textarea, Badge } from "@repo/ui";
import { prisma } from "@repo/db";
import { ActionForm } from "@/components/action-form";
import { createBusinessProfileAndPlan } from "@/lib/actions";
import { getWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const ws = await getWorkspace();
  const plans = await prisma.plan.findMany({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: "desc" },
    include: { markets: true, businessProfile: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">
          O <code>Plan</code> é o objeto pai. Crie o perfil da sua oferta e o
          plano — eles guiam descoberta, enrichment e mensagens.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding — oferta + plano</CardTitle>
          <CardDescription>Cria BusinessProfile e Plan (mercado Brasil).</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={createBusinessProfileAndPlan} submitLabel="Criar plano">
            <Field label="Nome do plano">
              <Input name="planName" placeholder="Plano inicial — Brasil" />
            </Field>
            <Field label="O que você vende (oferta)">
              <Input name="offer" placeholder="Plataforma de automação de outbound B2B" required />
            </Field>
            <Field label="Proposta de valor">
              <Input name="valueProp" placeholder="Mais reuniões qualificadas com menos esforço" required />
            </Field>
            <Field label="Objetivo comercial">
              <Input name="objective" placeholder="Gerar pipeline em agências de marketing no Brasil" required />
            </Field>
            <Field label="Tom de comunicação">
              <Input name="tone" placeholder="Direto e consultivo" />
            </Field>
          </ActionForm>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Planos existentes</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum plano ainda.</p>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {plans.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.objective}</span>
                  </div>
                  <div className="flex gap-1">
                    {p.markets.map((m) => (
                      <Badge key={m.id} variant="outline">{m.market}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
