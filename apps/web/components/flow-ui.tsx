import Link from "next/link";
import { Badge, Card, cn } from "@repo/ui";
import { getStageIndex, type FlowStage } from "@/lib/flow";

const stages: Array<{ key: FlowStage; label: string }> = [
  { key: "icp", label: "ICP" },
  { key: "discovery", label: "Descoberta" },
  { key: "refinement", label: "Refino" },
  { key: "campaign", label: "Campanha" },
  { key: "send", label: "Envio" },
];

export function StageStepper({ current }: { current: FlowStage }) {
  const activeIndex = getStageIndex(current);

  return (
    <div className="border-b border-border bg-surface px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-start overflow-x-auto md:justify-center">
        {stages.map((stage, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;

          return (
            <div key={stage.key} className="flex items-center">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                    done || active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-surface text-muted-foreground",
                    active && "ring-4 ring-surface-muted",
                  )}
                >
                  {done ? "✓" : index + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-xs font-medium",
                    active
                      ? "text-foreground"
                      : done
                        ? "text-foreground/80"
                        : "text-muted-foreground",
                  )}
                >
                  {stage.label}
                </span>
              </div>
              {index < stages.length - 1 && (
                <span className="mx-3 h-px w-8 shrink-0 bg-border" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {children && (
          <div className="mt-3 flex flex-wrap gap-1.5">{children}</div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border bg-surface shadow-none",
        className,
      )}
      {...props}
    />
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatusPill({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "solid";
}) {
  return (
    <Badge variant={variant} className="whitespace-nowrap rounded-md px-2 py-1">
      {children}
    </Badge>
  );
}

export function TierBadge({
  tier,
  size = "sm",
}: {
  tier: string | null;
  size?: "sm" | "md";
}) {
  if (!tier) return <StatusPill variant="outline">sem tier</StatusPill>;
  const className = cn(
    "font-mono font-semibold leading-none",
    size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs",
    tier === "A" && "border-transparent bg-foreground text-background",
    tier === "B" && "border-transparent bg-surface-muted text-foreground",
    tier !== "A" &&
      tier !== "B" &&
      "border-border bg-transparent text-muted-foreground",
  );

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border",
        className,
      )}
    >
      {tier}
    </span>
  );
}

export function ScoreBar({ value }: { value: number | null }) {
  const width = Math.max(0, Math.min(100, Math.round(value ?? 0)));

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full origin-left rounded-full bg-foreground"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-foreground/80">
        {value == null ? "—" : Math.round(value)}
      </span>
    </div>
  );
}

export function AsyncNotice({
  title = "Processando...",
  description = "A página atualiza sozinha quando o worker concluir.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm">
      <div className="font-medium">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-5 py-10 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-surface-muted text-lg">
        ◎
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  );
}
