"use client";

import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@repo/ui";

type ActionResult = { ok: boolean; message: string };

export function ActionButton({
  action,
  label,
  pendingLabel,
  variant = "outline",
  size,
}: {
  action: () => Promise<ActionResult>;
  label: string;
  pendingLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => start(async () => setResult(await action()))}
      >
        {pending ? (pendingLabel ?? "...") : label}
      </Button>
      {result && (
        <span className={result.ok ? "text-xs text-muted-foreground" : "text-xs text-red-600"}>
          {result.message}
        </span>
      )}
    </span>
  );
}
