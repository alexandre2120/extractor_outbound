"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Enquanto houver job ativo (research PENDING/RUNNING ou enrichment DRAFT),
 * atualiza a rota a cada `intervalMs` para refletir o progresso do worker.
 */
export function AutoRefresh({
  active,
  intervalMs = 3000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);

  if (!active) return null;
  return (
    <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
      ⏳ Worker processando… a página atualiza sozinha.
    </div>
  );
}
