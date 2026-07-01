"use client";

import { useActionState } from "react";
import { Button } from "@repo/ui";

type ActionResult = { ok: boolean; message: string };

export function ActionForm({
  action,
  children,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {children}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "..." : submitLabel}
        </Button>
        {state && (
          <span
            className={
              state.ok ? "text-xs text-muted-foreground" : "text-xs text-red-600"
            }
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
