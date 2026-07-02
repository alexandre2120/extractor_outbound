# Campaign Selected Company Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let selected ranking companies become actionable inside a campaign by showing what each one needs and offering one bulk preparation action.

**Architecture:** Keep the campaign detail as the orchestration surface. Add pure helper functions for selected-company readiness so behavior is testable without the database, then add server actions that reuse the existing research, enrichment, and approval workflow. The UI will show selected companies grouped by readiness and provide clear next actions.

**Tech Stack:** Next.js App Router 15, React 19 server components, Prisma, BullMQ queues, Node test runner with `tsx`.

## Global Constraints

- Do not add new database tables for campaign membership in this pass.
- Preserve selected companies through query params until a persisted campaign-company model exists.
- Only companies with `APPROVED` enrichment can generate campaign sequence messages.
- Use existing server action and queue patterns from `apps/web/lib/actions.ts`.
- Keep UI copy in Portuguese.

---

### Task 1: Selected Company Readiness Helpers

**Files:**

- Create: `apps/web/lib/selected-companies.ts`
- Test: `apps/web/lib/selected-companies.test.ts`

**Interfaces:**

- Produces: `getSelectedCompanyReadiness(companies: SelectedCompanyInput[]): SelectedCompanyReadiness`
- Produces: `getSelectedCompanyPrepIds(companies: SelectedCompanyInput[]): SelectedCompanyPrepIds`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSelectedCompanyPrepIds,
  getSelectedCompanyReadiness,
  type SelectedCompanyInput,
} from "./selected-companies";

const companies: SelectedCompanyInput[] = [
  {
    id: "co_ready",
    name: "Ready",
    domain: "ready.test",
    email: "hello@ready.test",
    websiteSummary: "facts",
    researchStatuses: ["DONE"],
    enrichmentStatuses: ["APPROVED"],
  },
  {
    id: "co_approve",
    name: "Approve",
    domain: "approve.test",
    email: null,
    websiteSummary: "facts",
    researchStatuses: ["DONE"],
    enrichmentStatuses: ["GENERATED"],
  },
  {
    id: "co_enrich",
    name: "Enrich",
    domain: "enrich.test",
    email: null,
    websiteSummary: "facts",
    researchStatuses: ["DONE"],
    enrichmentStatuses: [],
  },
  {
    id: "co_research",
    name: "Research",
    domain: "research.test",
    email: null,
    websiteSummary: null,
    researchStatuses: [],
    enrichmentStatuses: [],
  },
];

describe("selected company readiness", () => {
  it("groups selected companies by next required action", () => {
    assert.deepEqual(getSelectedCompanyReadiness(companies), {
      ready: ["co_ready"],
      needsApproval: ["co_approve"],
      needsEnrichment: ["co_enrich"],
      needsResearch: ["co_research"],
      blocked: [],
    });
  });

  it("returns ids that can be prepared in bulk", () => {
    assert.deepEqual(getSelectedCompanyPrepIds(companies), {
      approveIds: ["co_approve"],
      enrichIds: ["co_enrich"],
      researchIds: ["co_research"],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @repo/web test`
Expected: FAIL because `./selected-companies` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/selected-companies.ts` with typed helpers that classify each selected company as ready, needs approval, needs enrichment, needs research, or blocked.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @repo/web test`
Expected: PASS.

### Task 2: Bulk Prep Server Action

**Files:**

- Modify: `apps/web/lib/actions.ts`

**Interfaces:**

- Consumes: selected company IDs from `FormData.getAll("companyId")`
- Produces: `prepareSelectedCompaniesAction(campaignId: string, formData: FormData): Promise<ActionResult>`

- [ ] **Step 1: Add action**

Add a server action that validates campaign workspace, approves `GENERATED`/`REVIEWED` enrichments, enqueues enrichment for companies with website facts, enqueues research for companies with a domain/email domain, skips active jobs, and revalidates the campaign page.

- [ ] **Step 2: Verify compile**

Run: `corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false`
Expected: exit 0.

### Task 3: Campaign Detail UX

**Files:**

- Modify: `apps/web/app/campaigns/[id]/page.tsx`

**Interfaces:**

- Consumes: `getSelectedCompanyReadiness`, `getSelectedCompanyPrepIds`, `prepareSelectedCompaniesAction`

- [ ] **Step 1: Fetch enough company state**

Load selected companies with `website`, recent `researchJobs`, and recent `enrichments` instead of approved-only enrichments.

- [ ] **Step 2: Render readiness and actions**

Show counts for ready, approval, enrichment, research, and blocked. Add a `Preparar selecionadas` bulk form when any selected company can advance. Keep `Gerar sequência` focused on approved companies.

- [ ] **Step 3: Verify in browser**

Open a campaign URL with selected `companyId` params. Expected: selected companies show clear statuses, bulk prep button is visible, and ready companies remain checked in the sequence generator.

### Task 4: Final Verification

**Files:**

- Verify only

- [ ] **Step 1: Run unit tests**

Run: `corepack pnpm --filter @repo/web test`
Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

Run: `corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false`
Expected: exit 0.

- [ ] **Step 3: Run production build**

Run: `corepack pnpm --filter @repo/web build`
Expected: exit 0.

## Self-Review

- Spec coverage: selected companies get next-step visibility, bulk preparation, and the existing approved-only generation rule stays intact.
- Placeholder scan: no placeholder steps remain.
- Type consistency: helper and action names match the planned consumers.
