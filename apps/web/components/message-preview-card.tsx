import Link from "next/link";
import { StatusPill } from "@/components/flow-ui";
import { renderOutboundEmailHtml } from "@/lib/email-template";

type MessagePreviewEvent = {
  id: string;
  type: string;
};

type MessagePreviewCardProps = {
  subject?: string | null;
  body: string;
  companyName: string;
  companyHref?: string;
  campaignName?: string | null;
  stepOrder?: number | null;
  status: string;
  events?: MessagePreviewEvent[];
  action?: React.ReactNode;
};

export function MessagePreviewCard({
  subject,
  body,
  companyName,
  companyHref,
  campaignName,
  stepOrder,
  status,
  events = [],
  action,
}: MessagePreviewCardProps) {
  const html = renderOutboundEmailHtml({ subject, body });
  const displaySubject = subject?.trim() || "(sem assunto)";
  const stepLabel = stepOrder == null ? "passo -" : `passo ${stepOrder}`;

  return (
    <article className="px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{displaySubject}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {companyHref ? (
              <Link
                href={companyHref}
                className="font-medium text-foreground hover:underline"
              >
                {companyName}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{companyName}</span>
            )}
            <span>·</span>
            <span>{campaignName ?? "sem campanha"}</span>
            <span>·</span>
            <span>{stepLabel}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <StatusPill variant={status === "SENT" ? "solid" : "default"}>
            {status}
          </StatusPill>
          {action}
        </div>
      </div>

      {events.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {events.map((event) => (
            <StatusPill key={event.id} variant="outline">
              {event.type.toLowerCase()}
            </StatusPill>
          ))}
        </div>
      )}

      <details open className="mt-4">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Mensagem que será enviada no Brevo
        </summary>
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          <section className="overflow-hidden rounded-md border border-border bg-surface-muted/40">
            <div className="border-b border-border/70 px-4 py-2 text-xs font-semibold text-muted-foreground">
              Texto puro
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-4 font-sans text-sm leading-6 text-foreground">
              {body}
            </pre>
          </section>

          <section className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border/70 px-4 py-2 text-xs font-semibold text-muted-foreground">
              Preview HTML
            </div>
            <iframe
              title={`Preview HTML - ${displaySubject}`}
              srcDoc={html}
              sandbox=""
              referrerPolicy="no-referrer"
              className="h-80 w-full bg-white"
            />
          </section>
        </div>
      </details>
    </article>
  );
}
