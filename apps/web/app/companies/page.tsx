import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Badge } from "@repo/ui";
import { prisma } from "@repo/db";
import { ActionForm } from "@/components/action-form";
import { ingestCompanyByCnpj } from "@/lib/actions";
import { getWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const ws = await getWorkspace();
  const companies = await prisma.company.findMany({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: "desc" },
    include: {
      registryData: true,
      _count: { select: { enrichments: true, researchJobs: true, messages: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          microCRM. Ingestão por CNPJ (CNPJá) → verdade cadastral. Camadas:
          registry &gt; website &gt; ai.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingerir empresa por CNPJ</CardTitle>
          <CardDescription>Consulta a CNPJá e cria a empresa no microCRM.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={ingestCompanyByCnpj} submitLabel="Ingerir">
            <Field label="CNPJ">
              <Input name="cnpj" placeholder="00.000.000/0001-91" required />
            </Field>
          </ActionForm>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Empresas ({companies.length})</h2>
        {companies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma empresa ainda.</p>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {companies.map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-muted"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.registryData?.status ?? "—"} · {c.city ?? "?"}/{c.state ?? "?"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {c._count.researchJobs > 0 && <Badge variant="outline">research</Badge>}
                    {c._count.enrichments > 0 && <Badge variant="outline">ai</Badge>}
                    {c._count.messages > 0 && <Badge variant="outline">msg</Badge>}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
