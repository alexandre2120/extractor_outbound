import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

export default function CampaignsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Geração de mensagens a partir de Plan + Company + AIEnrichment, com
          envio e tracking via Brevo.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Outbound Campaigns</CardTitle>
          <CardDescription>Em construção — Camada 2.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            OutboundCampaign, SequenceStep, GeneratedMessage e DeliveryEvent já
            modelados. Revisão humana obrigatória antes do disparo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
