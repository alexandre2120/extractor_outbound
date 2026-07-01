import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";

const pipeline = [
  { step: "Plan", desc: "Estratégia comercial gera filtros e listas." },
  { step: "Lead Discovery", desc: "Providers cadastrais alimentam o microCRM." },
  { step: "Browser Research", desc: "Fatos públicos do site, com URL e timestamp." },
  { step: "AI Enrichment", desc: "Inferência comercial — manual, com revisão." },
  { step: "Outbound", desc: "Mensagens via Brevo, eventos rastreados." },
];

const modules = [
  { name: "Onboarding", status: "pendente" },
  { name: "Plan Builder", status: "pendente" },
  { name: "Lead Discovery", status: "pendente" },
  { name: "Company Registry / microCRM", status: "schema pronto" },
  { name: "Browser Research", status: "pendente" },
  { name: "AI Enrichment", status: "pendente" },
  { name: "Outbound Campaigns", status: "pendente" },
  { name: "Documentation & Tracking", status: "em andamento" },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Outbound plan-first
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Sistema orientado por plano: a estratégia comercial gera filtros,
          listas, pesquisa, enriquecimento e campanhas. A base factual vem de
          fontes estruturadas; a IA entra como camada complementar e controlada.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Pipeline</h2>
        <div className="grid gap-3 md:grid-cols-5">
          {pipeline.map((p, i) => (
            <Card key={p.step}>
              <CardHeader>
                <div className="text-xs text-muted-foreground">0{i + 1}</div>
                <CardTitle>{p.step}</CardTitle>
                <CardDescription>{p.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Módulos</h2>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {modules.map((m) => (
              <div
                key={m.name}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="text-sm">{m.name}</span>
                <Badge variant="outline">{m.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
