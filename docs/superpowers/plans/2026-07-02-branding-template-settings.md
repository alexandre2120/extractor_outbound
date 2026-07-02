# Branding Template Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build reviewed branding/template settings from the user's website, let the user apply the suggested offer, and use approved settings in email preview and Brevo sends.

**Architecture:** Add a persisted `EmailTemplateSettings` model tied to `Workspace` and optionally `BusinessProfile`. Extract website branding through the existing KIE + research stack into a draft, expose it in a plan-detail review panel, and pass approved settings into the existing email renderer used by both preview and send.

**Tech Stack:** Next.js App Router server actions, Prisma, Zod, KIE chat JSON, existing Playwright research utilities, React Server Components, `@repo/ui`, Node test runner with `tsx`.

## Global Constraints

- Keep this phase focused on template, branding, and offer setup from the user's own website.
- Do not refine campaigns with website content in this phase.
- Do not alter campaign or sequence generation prompts in this phase.
- Do not create a drag-and-drop email editor.
- Do not integrate with Brevo's saved-template API.
- Do not add advanced tracking, unsubscribe, or compliance beyond current Brevo send behavior.
- The agent suggests branding/settings; the user approves before settings affect preview or send.
- At most one `EmailTemplateSettings` with `status = APPROVED` and `isActive = true` per workspace.
- Valid colors are hex strings in `#RRGGBB` format.
- Logo and CTA URLs must be `https://` after normalization or they must be treated as empty.
- Never automatically overwrite an existing `BusinessProfile.offer`.
- Email HTML must stay lightweight: no scripts, no external CSS, no base64 images.
- Existing behavior without approved settings must remain unchanged.
- Follow TDD for each task: write the failing test, run it, implement, rerun.

---

## File Structure

- `packages/db/prisma/schema.prisma`
  - Add `EmailTemplateSettings`, `TemplateSettingsStatus`, `TemplateSettingsSource`, and relations on `Workspace` and `BusinessProfile`.
- `packages/schemas/src/index.ts`
  - Add shared Zod schemas/types for extracted template settings.
- `packages/schemas/src/template-settings.test.ts`
  - Test extraction schema defaults and validation.
- `packages/prompts/src/index.ts`
  - Add prompt builder and system prompt for website branding extraction.
- `packages/prompts/src/template-settings-prompt.test.ts`
  - Test prompt includes required evidence and JSON contract.
- `packages/integrations/src/branding-research.ts`
  - Research the user's website for visible text, title/meta, logo candidates, and color candidates.
- `packages/integrations/src/index.ts`
  - Export `researchBrandingWebsite` and `extractTemplateSettings`.
- `apps/web/lib/template-settings.ts`
  - Normalize colors/URLs/form payloads and expose `EmailTemplateSettingsView`.
- `apps/web/lib/template-settings.test.ts`
  - Test normalization and safe fallbacks.
- `apps/web/lib/email-template.ts`
  - Accept optional approved settings and render brand-aware HTML.
- `apps/web/lib/email-template.test.ts`
  - Extend tests for branding, escaping, unsafe URL rejection, and unchanged default HTML.
- `apps/web/components/message-preview-card.tsx`
  - Accept settings and pass them to `renderOutboundEmailHtml`.
- `apps/web/components/template-settings-panel.tsx`
  - Render website generation, editable draft settings, offer application, approval, and sample preview.
- `apps/web/app/plans/[id]/page.tsx`
  - Load business profile and template settings, render panel.
- `apps/web/app/companies/[id]/page.tsx`
  - Load active settings and pass to message previews.
- `apps/web/app/campaigns/[id]/page.tsx`
  - Load active settings and pass to message previews.
- `apps/web/lib/actions.ts`
  - Add generation/save/approve actions; update send to load approved settings.
- `apps/web/lib/message-preview-source.test.ts`
  - Assert preview/send use active template settings.
- `apps/web/lib/plan-form-source.test.ts`
  - Assert branding panel long fields use textareas.
- `docs/changes/2026-07-02-plan-first-ui-campaign-flow.md`
  - Document the branding/template settings addition and known next phase.

---

### Task 1: Schema And Local Settings Validation

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Modify: `packages/schemas/src/index.ts`
- Create: `packages/schemas/src/template-settings.test.ts`
- Create: `apps/web/lib/template-settings.ts`
- Create: `apps/web/lib/template-settings.test.ts`

**Interfaces:**
- Produces Prisma model/enums:
  - `EmailTemplateSettings`
  - `TemplateSettingsStatus`
  - `TemplateSettingsSource`
- Produces Zod schema/type:
  - `extractedTemplateSettingsOutput`
  - `type ExtractedTemplateSettingsOutput`
- Produces app helper/type:
  - `type EmailTemplateSettingsView`
  - `normalizeHexColor(value: FormDataEntryValue | string | null | undefined): string | null`
  - `normalizeWebsiteUrl(value: FormDataEntryValue | string | null | undefined): string | null`
  - `sanitizeHttpsUrl(value: FormDataEntryValue | string | null | undefined): string | null`
  - `normalizeTemplateSettingsDraft(input: Record<string, FormDataEntryValue | string | null | undefined>): TemplateSettingsDraft`
  - `shouldApplySuggestedOffer(currentOffer: string | null | undefined, requested: boolean): boolean`

- [ ] **Step 1: Write failing package schema tests**

Create `packages/schemas/src/template-settings.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractedTemplateSettingsOutput } from "./index";

describe("extractedTemplateSettingsOutput", () => {
  it("normalizes optional extracted branding fields to null/defaults", () => {
    const parsed = extractedTemplateSettingsOutput.parse({
      websiteUrl: "https://example.com",
      brandName: "Example",
      evidenceRefs: ["https://example.com"],
    });

    assert.equal(parsed.websiteUrl, "https://example.com");
    assert.equal(parsed.brandName, "Example");
    assert.equal(parsed.logoUrl, null);
    assert.equal(parsed.primaryColor, null);
    assert.deepEqual(parsed.evidenceRefs, ["https://example.com"]);
  });

  it("rejects malformed extraction payloads", () => {
    assert.throws(() => extractedTemplateSettingsOutput.parse({ brandName: "No URL" }));
  });
});
```

- [ ] **Step 2: Write failing app helper tests**

Create `apps/web/lib/template-settings.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeHexColor,
  normalizeTemplateSettingsDraft,
  normalizeWebsiteUrl,
  sanitizeHttpsUrl,
  shouldApplySuggestedOffer,
} from "./template-settings";

describe("template settings helpers", () => {
  it("normalizes colors to uppercase #RRGGBB", () => {
    assert.equal(normalizeHexColor(" #12abEF "), "#12ABEF");
    assert.equal(normalizeHexColor("#123"), null);
    assert.equal(normalizeHexColor("red"), null);
  });

  it("normalizes website domains to https URLs", () => {
    assert.equal(normalizeWebsiteUrl("example.com"), "https://example.com");
    assert.equal(normalizeWebsiteUrl("https://example.com/about"), "https://example.com/about");
    assert.equal(normalizeWebsiteUrl("http://example.com"), null);
  });

  it("keeps only safe https asset and CTA URLs", () => {
    assert.equal(sanitizeHttpsUrl("https://cdn.example.com/logo.png"), "https://cdn.example.com/logo.png");
    assert.equal(sanitizeHttpsUrl("http://cdn.example.com/logo.png"), null);
    assert.equal(sanitizeHttpsUrl("javascript:alert(1)"), null);
  });

  it("normalizes a draft settings payload", () => {
    const draft = normalizeTemplateSettingsDraft({
      websiteUrl: "example.com",
      brandName: "  Acme  ",
      primaryColor: "#aabbcc",
      logoUrl: "http://example.com/logo.png",
      signature: "  Equipa Acme  ",
    });

    assert.equal(draft.websiteUrl, "https://example.com");
    assert.equal(draft.brandName, "Acme");
    assert.equal(draft.primaryColor, "#AABBCC");
    assert.equal(draft.logoUrl, null);
    assert.equal(draft.signature, "Equipa Acme");
  });

  it("applies suggested offer only when explicitly requested", () => {
    assert.equal(shouldApplySuggestedOffer("", true), true);
    assert.equal(shouldApplySuggestedOffer("Existing offer", true), true);
    assert.equal(shouldApplySuggestedOffer("", false), false);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
corepack pnpm exec tsx --test packages/schemas/src/template-settings.test.ts
corepack pnpm --filter @repo/web test -- template-settings.test.ts
```

Expected:

- First command fails because `extractedTemplateSettingsOutput` is not exported.
- Second command fails because `apps/web/lib/template-settings.ts` does not exist.

- [ ] **Step 4: Add Prisma schema**

Modify `packages/db/prisma/schema.prisma`.

Add relations:

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  businessProfiles     BusinessProfile[]
  plans                Plan[]
  leadLists            LeadList[]
  companies            Company[]
  campaigns            OutboundCampaign[]
  agentTasks           AgentTask[]
  checkpoints          ProjectCheckpoint[]
  discoveryRuns        DiscoveryRun[]
  emailTemplateSettings EmailTemplateSettings[]
}

model BusinessProfile {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  offer       String
  valueProp   String
  positioning String?
  tone        String?
  objective   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace             Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  plans                 Plan[]
  emailTemplateSettings EmailTemplateSettings[]

  @@index([workspaceId])
}
```

Add the new enums/model near the workspace/profile section:

```prisma
enum TemplateSettingsStatus {
  DRAFT
  APPROVED
}

enum TemplateSettingsSource {
  MANUAL
  WEBSITE_AGENT
}

model EmailTemplateSettings {
  id                String @id @default(cuid())
  workspaceId       String
  businessProfileId String?

  status   TemplateSettingsStatus @default(DRAFT)
  source   TemplateSettingsSource @default(MANUAL)
  isActive Boolean @default(false)

  websiteUrl      String?
  brandName       String?
  logoUrl         String?
  primaryColor    String?
  accentColor     String?
  backgroundColor String?
  fontFamily      String?

  senderName String?
  senderRole String?
  signature  String?
  ctaLabel   String?
  ctaUrl     String?

  offerSummary     String?
  valueProposition String?
  tone             String?

  rawExtraction Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  approvedAt    DateTime?

  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  businessProfile BusinessProfile? @relation(fields: [businessProfileId], references: [id], onDelete: SetNull)

  @@index([workspaceId])
  @@index([businessProfileId])
  @@index([workspaceId, status, isActive])
}
```

- [ ] **Step 5: Add shared extraction schema**

Modify `packages/schemas/src/index.ts`:

```ts
const nullableTrimmedString = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const extractedTemplateSettingsOutput = z.object({
  brandName: nullableTrimmedString,
  websiteUrl: z.string().trim().min(1),
  logoUrl: nullableTrimmedString,
  primaryColor: nullableTrimmedString,
  accentColor: nullableTrimmedString,
  backgroundColor: nullableTrimmedString,
  fontFamily: nullableTrimmedString,
  senderName: nullableTrimmedString,
  senderRole: nullableTrimmedString,
  signature: nullableTrimmedString,
  ctaLabel: nullableTrimmedString,
  ctaUrl: nullableTrimmedString,
  offerSummary: nullableTrimmedString,
  valueProposition: nullableTrimmedString,
  tone: nullableTrimmedString,
  evidenceRefs: z.array(z.string()).default([]),
});
export type ExtractedTemplateSettingsOutput = z.infer<
  typeof extractedTemplateSettingsOutput
>;
```

- [ ] **Step 6: Add app helper implementation**

Create `apps/web/lib/template-settings.ts`:

```ts
export type EmailTemplateSettingsView = {
  brandName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  fontFamily?: string | null;
  senderName?: string | null;
  senderRole?: string | null;
  signature?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
};

export type TemplateSettingsDraft = EmailTemplateSettingsView & {
  websiteUrl: string | null;
  offerSummary: string | null;
  valueProposition: string | null;
  tone: string | null;
};

type RawValue = FormDataEntryValue | string | null | undefined;

export function normalizeHexColor(value: RawValue): string | null {
  const text = clean(value);
  if (!text) return null;
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toUpperCase() : null;
}

export function normalizeWebsiteUrl(value: RawValue): string | null {
  const text = clean(value);
  if (!text) return null;
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  return sanitizeHttpsUrl(withProtocol);
}

export function sanitizeHttpsUrl(value: RawValue): string | null {
  const text = clean(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeTemplateSettingsDraft(
  input: Record<string, RawValue>,
): TemplateSettingsDraft {
  return {
    websiteUrl: normalizeWebsiteUrl(input.websiteUrl),
    brandName: clean(input.brandName),
    logoUrl: sanitizeHttpsUrl(input.logoUrl),
    primaryColor: normalizeHexColor(input.primaryColor),
    accentColor: normalizeHexColor(input.accentColor),
    backgroundColor: normalizeHexColor(input.backgroundColor),
    fontFamily: clean(input.fontFamily),
    senderName: clean(input.senderName),
    senderRole: clean(input.senderRole),
    signature: clean(input.signature),
    ctaLabel: clean(input.ctaLabel),
    ctaUrl: sanitizeHttpsUrl(input.ctaUrl),
    offerSummary: clean(input.offerSummary),
    valueProposition: clean(input.valueProposition),
    tone: clean(input.tone),
  };
}

export function shouldApplySuggestedOffer(
  currentOffer: string | null | undefined,
  requested: boolean,
): boolean {
  return requested;
}

function clean(value: RawValue): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}
```

- [ ] **Step 7: Generate Prisma client**

Run:

```bash
corepack pnpm db:generate
```

Expected: Prisma Client generation succeeds.

If the local database is available, also run:

```bash
corepack pnpm db:migrate -- --name email_template_settings
```

Expected: migration is created and applied. If the DB is unavailable, report that and do not fake a migration file by hand.

- [ ] **Step 8: Run tests to verify pass**

Run:

```bash
corepack pnpm exec tsx --test packages/schemas/src/template-settings.test.ts
corepack pnpm --filter @repo/web test -- template-settings.test.ts
corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/schemas/src/index.ts packages/schemas/src/template-settings.test.ts apps/web/lib/template-settings.ts apps/web/lib/template-settings.test.ts packages/db/prisma/migrations
git commit -m "feat: add email template settings schema"
```

---

### Task 2: Website Branding Research And AI Extraction

**Files:**
- Modify: `packages/prompts/src/index.ts`
- Create: `packages/prompts/src/template-settings-prompt.test.ts`
- Create: `packages/integrations/src/branding-research.ts`
- Modify: `packages/integrations/src/index.ts`

**Interfaces:**
- Consumes: `extractedTemplateSettingsOutput` from Task 1.
- Produces:
  - `TEMPLATE_SETTINGS_SYSTEM`
  - `type TemplateSettingsPromptInput`
  - `buildTemplateSettingsPrompt(input: TemplateSettingsPromptInput): string`
  - `type BrandingResearchOutput`
  - `researchBrandingWebsite(domain: string, opts?: { timeoutMs?: number; maxPages?: number; headless?: boolean }): Promise<BrandingResearchOutput>`
  - `extractTemplateSettings(kie: KieClient, input: TemplateSettingsPromptInput): Promise<{ result: ExtractedTemplateSettingsOutput; creditsConsumed?: number }>`

- [ ] **Step 1: Write failing prompt test**

Create `packages/prompts/src/template-settings-prompt.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TEMPLATE_SETTINGS_SYSTEM,
  buildTemplateSettingsPrompt,
} from "./index";

describe("template settings prompt", () => {
  it("requests strict JSON and includes website evidence", () => {
    const prompt = buildTemplateSettingsPrompt({
      websiteUrl: "https://example.com",
      evidence: "[home] Example helps B2B teams book meetings.",
      logoCandidates: ["https://example.com/logo.png"],
      colorCandidates: ["#111111", "#FFFFFF"],
    });

    assert.match(TEMPLATE_SETTINGS_SYSTEM, /SOMENTE em JSON/);
    assert.match(prompt, /https:\/\/example\.com/);
    assert.match(prompt, /Example helps B2B teams/);
    assert.match(prompt, /logo\.png/);
    assert.match(prompt, /primaryColor/);
    assert.match(prompt, /offerSummary/);
  });
});
```

- [ ] **Step 2: Run prompt test to verify failure**

Run:

```bash
corepack pnpm exec tsx --test packages/prompts/src/template-settings-prompt.test.ts
```

Expected: fails because prompt exports do not exist.

- [ ] **Step 3: Add prompt contract**

Modify `packages/prompts/src/index.ts`:

```ts
export interface TemplateSettingsPromptInput {
  websiteUrl: string;
  evidence: string;
  logoCandidates: string[];
  colorCandidates: string[];
}

export const TEMPLATE_SETTINGS_SYSTEM = `Voce extrai branding e material comercial de um site B2B.
Regras:
- Use APENAS as evidencias fornecidas.
- Se nao houver evidencia suficiente para um campo, retorne null.
- Cores devem estar no formato #RRGGBB quando confiaveis.
- URLs de logo e CTA devem ser https:// quando confiaveis.
- O campo offerSummary deve responder claramente "o que a empresa vende".
- Nao invente clientes, cases, metricas ou promessas.
- Responda SOMENTE em JSON valido conforme o schema solicitado.`;

export function buildTemplateSettingsPrompt(
  input: TemplateSettingsPromptInput,
): string {
  return `Website da empresa usuaria: ${input.websiteUrl}

Evidencias observadas:
${input.evidence || "(sem evidencias textuais suficientes)"}

Candidatos de logo:
${input.logoCandidates.length ? input.logoCandidates.join("\n") : "(nenhum)"}

Candidatos de cores:
${input.colorCandidates.length ? input.colorCandidates.join(", ") : "(nenhuma)"}

Gere JSON com exatamente estes campos:
{
  "brandName": string | null,
  "websiteUrl": string,
  "logoUrl": string | null,
  "primaryColor": string | null,
  "accentColor": string | null,
  "backgroundColor": string | null,
  "fontFamily": string | null,
  "senderName": string | null,
  "senderRole": string | null,
  "signature": string | null,
  "ctaLabel": string | null,
  "ctaUrl": string | null,
  "offerSummary": string | null,
  "valueProposition": string | null,
  "tone": string | null,
  "evidenceRefs": string[]
}`;
}
```

- [ ] **Step 4: Add branding research utility**

Create `packages/integrations/src/branding-research.ts`:

```ts
import { runResearchPlaywright } from "./research-playwright";

export type BrandingResearchOutput = {
  websiteUrl: string;
  evidence: string;
  pagesVisited: string[];
  logoCandidates: string[];
  colorCandidates: string[];
  engine: "playwright" | "fallback";
};

export async function researchBrandingWebsite(
  domain: string,
  opts: { timeoutMs?: number; maxPages?: number; headless?: boolean } = {},
): Promise<BrandingResearchOutput> {
  const origin = normalizeOrigin(domain);
  const researched = await runResearchPlaywright(domain, {
    maxPages: opts.maxPages ?? 5,
    timeoutMs: opts.timeoutMs ?? 30000,
    headless: opts.headless ?? true,
  });
  const homeHtml = await fetch(origin)
    .then((response) => (response.ok ? response.text() : ""))
    .catch(() => "");
  const title = extractTitle(homeHtml);
  const metaDescription = extractMetaDescription(homeHtml);

  const logoCandidates = Array.from(
    new Set(
      [
        ...extractLogoCandidates(origin, homeHtml),
        ...researched.evidence
          .flatMap((item) => extractHttpsUrls(item.extracted))
          .filter((url) => /logo|brand|marca/i.test(url)),
      ].slice(0, 8),
    ),
  );

  const colorCandidates = Array.from(
    new Set([
      ...extractHexColors(homeHtml),
      ...researched.evidence.flatMap((item) => extractHexColors(item.extracted)),
    ]),
  ).slice(0, 12);

  const evidence = [
    title ? `[title] ${title}` : null,
    metaDescription ? `[meta] ${metaDescription}` : null,
    researched.factualSummary,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    websiteUrl: origin,
    evidence,
    pagesVisited: researched.pagesVisited,
    logoCandidates,
    colorCandidates,
    engine: "playwright",
  };
}

function normalizeOrigin(input: string): string {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  return new URL(withProtocol).origin;
}

function extractHttpsUrls(text: string): string[] {
  return text.match(/https:\/\/[^\s"'<>)]*/g) ?? [];
}

function extractHexColors(text: string): string[] {
  return (text.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((color) =>
    color.toUpperCase(),
  );
}

function extractTitle(html: string): string | null {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
}

function extractMetaDescription(html: string): string | null {
  return (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1]?.trim() ??
    null
  );
}

function extractLogoCandidates(origin: string, html: string): string[] {
  const candidates = [
    ...Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi))
      .filter((match) => /logo|brand|marca/i.test(match[0]))
      .map((match) => match[1]),
    ...Array.from(html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi))
      .filter((match) => /icon|logo|apple-touch-icon/i.test(match[0]))
      .map((match) => match[1]),
  ];

  return candidates
    .map((candidate) => resolveHttpsUrl(origin, candidate))
    .filter((candidate): candidate is string => !!candidate);
}

function resolveHttpsUrl(origin: string, value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, origin);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Export integration helper**

Modify `packages/integrations/src/index.ts`.

Add imports:

```ts
import {
  buildTemplateSettingsPrompt,
  TEMPLATE_SETTINGS_SYSTEM,
  type TemplateSettingsPromptInput,
} from "@repo/prompts";
import {
  extractedTemplateSettingsOutput,
  type ExtractedTemplateSettingsOutput,
} from "@repo/schemas";
```

Export research:

```ts
export {
  researchBrandingWebsite,
  type BrandingResearchOutput,
} from "./branding-research";
```

Add function near the other KIE helpers:

```ts
export async function extractTemplateSettings(
  kie: KieClient,
  input: TemplateSettingsPromptInput,
): Promise<{ result: ExtractedTemplateSettingsOutput; creditsConsumed?: number }> {
  const { data, creditsConsumed } = await kie.chatJson(
    [
      { role: "system", content: TEMPLATE_SETTINGS_SYSTEM },
      { role: "user", content: buildTemplateSettingsPrompt(input) },
    ],
    { maxTokens: 900 },
  );
  const result = extractedTemplateSettingsOutput.parse(data);
  return { result, creditsConsumed };
}
```

- [ ] **Step 6: Run tests and typecheck**

Run:

```bash
corepack pnpm exec tsx --test packages/prompts/src/template-settings-prompt.test.ts packages/schemas/src/template-settings.test.ts
corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/prompts/src/index.ts packages/prompts/src/template-settings-prompt.test.ts packages/integrations/src/branding-research.ts packages/integrations/src/index.ts
git commit -m "feat: extract branding settings from website evidence"
```

---

### Task 3: Server Actions For Draft, Save, Approval, And Offer Application

**Files:**
- Modify: `apps/web/lib/actions.ts`
- Modify: `apps/web/lib/message-preview-source.test.ts`

**Interfaces:**
- Consumes:
  - `normalizeTemplateSettingsDraft`, `normalizeWebsiteUrl`, `shouldApplySuggestedOffer`
  - `researchBrandingWebsite`, `extractTemplateSettings`
- Produces server actions:
  - `generateTemplateSettingsFromWebsiteAction(planId: string, formData: FormData): Promise<ActionResult>`
  - `saveTemplateSettingsDraftAction(planId: string, formData: FormData): Promise<ActionResult>`
  - `approveTemplateSettingsAction(planId: string, settingsId: string): Promise<ActionResult>`

- [ ] **Step 1: Write failing source tests**

Modify `apps/web/lib/message-preview-source.test.ts` and add:

```ts
  it("defines template settings generation, save, and approval actions", () => {
    const actionsSource = readFileSync("lib/actions.ts", "utf8");

    assert.match(actionsSource, /generateTemplateSettingsFromWebsiteAction/);
    assert.match(actionsSource, /saveTemplateSettingsDraftAction/);
    assert.match(actionsSource, /approveTemplateSettingsAction/);
    assert.match(actionsSource, /researchBrandingWebsite/);
    assert.match(actionsSource, /extractTemplateSettings/);
    assert.match(actionsSource, /isActive:\s*false/);
    assert.match(actionsSource, /isActive:\s*true/);
  });
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
corepack pnpm --filter @repo/web test -- message-preview-source.test.ts
```

Expected: fails because actions do not exist.

- [ ] **Step 3: Add imports**

Modify `apps/web/lib/actions.ts` imports:

```ts
import {
  CampaignStatus,
  DeliveryEventType,
  EnrichmentStatus,
  JobStatus,
  MessageStatus,
  ProviderKind,
  TemplateSettingsSource,
  TemplateSettingsStatus,
  prisma,
} from "@repo/db";
import {
  clientsFromEnv,
  extractTemplateSettings,
  generateColdMessage,
  researchBrandingWebsite,
} from "@repo/integrations";
import {
  normalizeTemplateSettingsDraft,
  normalizeWebsiteUrl,
  shouldApplySuggestedOffer,
} from "./template-settings";
```

Keep all existing imports that are still used.

- [ ] **Step 4: Add helper to load a plan for template actions**

Add below `ActionResult`:

```ts
async function getPlanForTemplateSettings(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { businessProfile: true },
  });
  if (!plan) throw new Error("Plano não encontrado.");
  return plan;
}
```

- [ ] **Step 5: Add generate action**

Add under the Plan editor section:

```ts
export async function generateTemplateSettingsFromWebsiteAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { kie } = clientsFromEnv();
  if (!kie) return { ok: false, message: "KIE não configurado." };

  const plan = await getPlanForTemplateSettings(planId);
  const websiteUrl = normalizeWebsiteUrl(formData.get("websiteUrl"));
  if (!websiteUrl) {
    return { ok: false, message: "Informe um website https válido." };
  }

  try {
    const research = await researchBrandingWebsite(websiteUrl, { maxPages: 5 });
    const { result } = await extractTemplateSettings(kie, {
      websiteUrl,
      evidence: research.evidence,
      logoCandidates: research.logoCandidates,
      colorCandidates: research.colorCandidates,
    });
    const normalized = normalizeTemplateSettingsDraft({
      ...result,
      websiteUrl,
    });

    await prisma.emailTemplateSettings.create({
      data: {
        workspaceId: plan.workspaceId,
        businessProfileId: plan.businessProfileId,
        status: TemplateSettingsStatus.DRAFT,
        source: TemplateSettingsSource.WEBSITE_AGENT,
        isActive: false,
        ...normalized,
        rawExtraction: {
          result,
          pagesVisited: research.pagesVisited,
          evidenceRefs: result.evidenceRefs,
        },
      },
    });

    revalidatePath(`/plans/${planId}`);
    return { ok: true, message: "Branding gerado como rascunho." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}
```

- [ ] **Step 6: Add save draft action**

Add:

```ts
export async function saveTemplateSettingsDraftAction(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  const plan = await getPlanForTemplateSettings(planId);
  const settingsId = String(formData.get("settingsId") ?? "").trim();
  const normalized = normalizeTemplateSettingsDraft({
    websiteUrl: formData.get("websiteUrl"),
    brandName: formData.get("brandName"),
    logoUrl: formData.get("logoUrl"),
    primaryColor: formData.get("primaryColor"),
    accentColor: formData.get("accentColor"),
    backgroundColor: formData.get("backgroundColor"),
    fontFamily: formData.get("fontFamily"),
    senderName: formData.get("senderName"),
    senderRole: formData.get("senderRole"),
    signature: formData.get("signature"),
    ctaLabel: formData.get("ctaLabel"),
    ctaUrl: formData.get("ctaUrl"),
    offerSummary: formData.get("offerSummary"),
    valueProposition: formData.get("valueProposition"),
    tone: formData.get("tone"),
  });

  const applyOffer = formData.get("applyOffer") === "on";
  await prisma.$transaction(async (tx) => {
    if (settingsId) {
      await tx.emailTemplateSettings.updateMany({
        where: { id: settingsId, workspaceId: plan.workspaceId },
        data: { ...normalized, status: TemplateSettingsStatus.DRAFT, isActive: false },
      });
    } else {
      await tx.emailTemplateSettings.create({
        data: {
          workspaceId: plan.workspaceId,
          businessProfileId: plan.businessProfileId,
          status: TemplateSettingsStatus.DRAFT,
          source: TemplateSettingsSource.MANUAL,
          isActive: false,
          ...normalized,
        },
      });
    }

    if (plan.businessProfileId && normalized.offerSummary && shouldApplySuggestedOffer(plan.businessProfile?.offer, applyOffer)) {
      await tx.businessProfile.update({
        where: { id: plan.businessProfileId },
        data: { offer: normalized.offerSummary },
      });
    }
  });

  revalidatePath(`/plans/${planId}`);
  return { ok: true, message: "Template salvo como rascunho." };
}
```

- [ ] **Step 7: Add approval action**

Add:

```ts
export async function approveTemplateSettingsAction(
  planId: string,
  settingsId: string,
): Promise<ActionResult> {
  const plan = await getPlanForTemplateSettings(planId);
  const settings = await prisma.emailTemplateSettings.findFirst({
    where: { id: settingsId, workspaceId: plan.workspaceId },
  });
  if (!settings) return { ok: false, message: "Template não encontrado." };

  await prisma.$transaction([
    prisma.emailTemplateSettings.updateMany({
      where: { workspaceId: plan.workspaceId },
      data: { isActive: false },
    }),
    prisma.emailTemplateSettings.update({
      where: { id: settingsId },
      data: {
        status: TemplateSettingsStatus.APPROVED,
        isActive: true,
        approvedAt: new Date(),
      },
    }),
  ]);

  revalidatePath(`/plans/${planId}`);
  revalidatePath("/companies");
  revalidatePath("/campaigns");
  return { ok: true, message: "Template aprovado para próximos envios." };
}
```

- [ ] **Step 8: Run tests and typecheck**

Run:

```bash
corepack pnpm --filter @repo/web test -- message-preview-source.test.ts template-settings.test.ts
corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add apps/web/lib/actions.ts apps/web/lib/message-preview-source.test.ts
git commit -m "feat: add template settings actions"
```

---

### Task 4: Brand-Aware Email Renderer, Preview, And Send

**Files:**
- Modify: `apps/web/lib/email-template.ts`
- Modify: `apps/web/lib/email-template.test.ts`
- Modify: `apps/web/components/message-preview-card.tsx`
- Modify: `apps/web/app/companies/[id]/page.tsx`
- Modify: `apps/web/app/campaigns/[id]/page.tsx`
- Modify: `apps/web/lib/actions.ts`
- Modify: `apps/web/lib/message-preview-source.test.ts`

**Interfaces:**
- Consumes: `EmailTemplateSettingsView` from Task 1.
- Produces:
  - `renderOutboundEmailHtml({ subject, body, settings })`
  - `MessagePreviewCard` prop `settings?: EmailTemplateSettingsView | null`
  - Send path loads active approved settings by workspace.

- [ ] **Step 1: Extend failing email template tests**

Modify `apps/web/lib/email-template.test.ts`:

```ts
  it("renders approved branding settings when provided", () => {
    const html = renderOutboundEmailHtml({
      subject: "Olá",
      body: "Mensagem principal.",
      settings: {
        brandName: "Acme",
        logoUrl: "https://cdn.example.com/logo.png",
        primaryColor: "#123456",
        backgroundColor: "#F5F7FA",
        fontFamily: "Inter",
        signature: "Equipe Acme",
        ctaLabel: "Ver diagnóstico",
        ctaUrl: "https://example.com/demo",
      },
    });

    assert.match(html, /https:\/\/cdn\.example\.com\/logo\.png/);
    assert.match(html, /#123456/);
    assert.match(html, /#F5F7FA/);
    assert.match(html, /Equipe Acme/);
    assert.match(html, /Ver diagnóstico/);
    assert.match(html, /https:\/\/example\.com\/demo/);
  });

  it("ignores unsafe branding URLs and escapes settings text", () => {
    const html = renderOutboundEmailHtml({
      subject: "Olá",
      body: "Corpo",
      settings: {
        logoUrl: "javascript:alert(1)",
        ctaUrl: "http://example.com",
        signature: "<strong>Assinatura</strong>",
      },
    });

    assert.doesNotMatch(html, /javascript:alert/);
    assert.doesNotMatch(html, /http:\/\/example\.com/);
    assert.match(html, /&lt;strong&gt;Assinatura&lt;\/strong&gt;/);
  });
```

- [ ] **Step 2: Extend source test for active settings use**

Modify `apps/web/lib/message-preview-source.test.ts`:

```ts
  it("loads active approved settings for message preview and Brevo send", () => {
    const companySource = readFileSync("app/companies/[id]/page.tsx", "utf8");
    const campaignSource = readFileSync("app/campaigns/[id]/page.tsx", "utf8");
    const actionsSource = readFileSync("lib/actions.ts", "utf8");

    assert.match(companySource, /emailTemplateSettings/);
    assert.match(companySource, /isActive:\s*true/);
    assert.match(campaignSource, /emailTemplateSettings/);
    assert.match(campaignSource, /isActive:\s*true/);
    assert.match(actionsSource, /emailTemplateSettings\.findFirst/);
    assert.match(actionsSource, /settings:/);
  });
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
corepack pnpm --filter @repo/web test -- email-template.test.ts message-preview-source.test.ts
```

Expected: fails because settings are not supported yet.

- [ ] **Step 4: Update renderer interface and helpers**

Modify `apps/web/lib/email-template.ts`:

```ts
import type { EmailTemplateSettingsView } from "./template-settings";
import { normalizeHexColor, sanitizeHttpsUrl } from "./template-settings";

export type OutboundEmailTemplateInput = {
  subject?: string | null;
  body: string;
  settings?: EmailTemplateSettingsView | null;
};
```

Update `renderOutboundEmailHtml` signature and derive safe values:

```ts
export function renderOutboundEmailHtml({
  subject,
  body,
  settings,
}: OutboundEmailTemplateInput): string {
  const safeSubject = escapeHtml(normalizeSubject(subject));
  const safePreview = escapeHtml(makePreviewText(body));
  const theme = normalizeTheme(settings);
  const bodyHtml = renderBodyHtml(body);
  const logoHtml = renderLogoHtml(theme);
  const signatureHtml = renderSignatureHtml(theme);
  const ctaHtml = renderCtaHtml(theme);
```

Add helper functions:

```ts
type NormalizedTheme = {
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  signature: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
};

function normalizeTheme(settings?: EmailTemplateSettingsView | null): NormalizedTheme {
  return {
    brandName: settings?.brandName?.trim() || null,
    logoUrl: sanitizeHttpsUrl(settings?.logoUrl),
    primaryColor: normalizeHexColor(settings?.primaryColor) ?? "#1f2328",
    backgroundColor: normalizeHexColor(settings?.backgroundColor) ?? "#f6f7f9",
    fontFamily: sanitizeFontFamily(settings?.fontFamily),
    signature: settings?.signature?.trim() || null,
    ctaLabel: settings?.ctaLabel?.trim() || null,
    ctaUrl: sanitizeHttpsUrl(settings?.ctaUrl),
  };
}

function sanitizeFontFamily(value?: string | null): string {
  const text = value?.trim();
  if (!text || /[;"'<>]/.test(text)) return "Arial, Helvetica, sans-serif";
  return `${text}, Arial, Helvetica, sans-serif`;
}

function renderLogoHtml(theme: NormalizedTheme): string {
  if (!theme.logoUrl) return "";
  const alt = escapeHtml(theme.brandName ?? "Logo");
  return `<div style="margin:0 0 22px 0;"><img src="${theme.logoUrl}" alt="${alt}" width="120" style="display:block; max-width:120px; height:auto; border:0;"></div>`;
}

function renderSignatureHtml(theme: NormalizedTheme): string {
  if (!theme.signature) return "";
  return `<p style="margin:22px 0 0 0; color:#2f3337;">${escapeHtml(theme.signature).replace(/\n/g, "<br />")}</p>`;
}

function renderCtaHtml(theme: NormalizedTheme): string {
  if (!theme.ctaLabel || !theme.ctaUrl) return "";
  return `<p style="margin:22px 0 0 0;"><a href="${theme.ctaUrl}" style="color:${theme.primaryColor}; text-decoration:underline;">${escapeHtml(theme.ctaLabel)}</a></p>`;
}
```

In the returned HTML, replace hardcoded background/font styles with `theme.backgroundColor` and `theme.fontFamily`; render `${logoHtml}` before `${bodyHtml}` and `${signatureHtml}${ctaHtml}` after the body.

- [ ] **Step 5: Update preview component**

Modify `apps/web/components/message-preview-card.tsx`:

```ts
import type { EmailTemplateSettingsView } from "@/lib/template-settings";
```

Add prop:

```ts
settings?: EmailTemplateSettingsView | null;
```

Pass into renderer:

```ts
const html = renderOutboundEmailHtml({ subject, body, settings });
```

- [ ] **Step 6: Load settings in company page**

Modify `apps/web/app/companies/[id]/page.tsx` company query include:

```ts
workspace: {
  include: {
    emailTemplateSettings: {
      where: { status: "APPROVED", isActive: true },
      orderBy: { approvedAt: "desc" },
      take: 1,
    },
  },
},
```

After `primary`, add:

```ts
const activeTemplateSettings = company.workspace.emailTemplateSettings[0] ?? null;
```

Pass to `MessagePreviewCard`:

```tsx
settings={activeTemplateSettings}
```

- [ ] **Step 7: Load settings in campaign page**

Modify campaign query include:

```ts
workspace: {
  include: {
    emailTemplateSettings: {
      where: { status: "APPROVED", isActive: true },
      orderBy: { approvedAt: "desc" },
      take: 1,
    },
  },
},
```

After campaign exists:

```ts
const activeTemplateSettings = campaign.workspace.emailTemplateSettings[0] ?? null;
```

Pass to `MessagePreviewCard`:

```tsx
settings={activeTemplateSettings}
```

- [ ] **Step 8: Load settings in send action**

Modify `sendMessageAction` query:

```ts
include: {
  company: {
    include: {
      workspace: {
        include: {
          emailTemplateSettings: {
            where: { status: TemplateSettingsStatus.APPROVED, isActive: true },
            orderBy: { approvedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  },
  campaign: true,
},
```

Update HTML render:

```ts
const settings = message.company.workspace.emailTemplateSettings[0] ?? null;
const html = renderOutboundEmailHtml({
  subject,
  body: message.body,
  settings,
});
```

- [ ] **Step 9: Run tests and build**

Run:

```bash
corepack pnpm --filter @repo/web test -- email-template.test.ts message-preview-source.test.ts
corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false
corepack pnpm --filter @repo/web build
```

Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add apps/web/lib/email-template.ts apps/web/lib/email-template.test.ts apps/web/components/message-preview-card.tsx 'apps/web/app/companies/[id]/page.tsx' 'apps/web/app/campaigns/[id]/page.tsx' apps/web/lib/actions.ts apps/web/lib/message-preview-source.test.ts
git commit -m "feat: render approved branding in outbound emails"
```

---

### Task 5: Plan Detail Review UI For Branding, Offer, And Approval

**Files:**
- Create: `apps/web/components/template-settings-panel.tsx`
- Modify: `apps/web/app/plans/[id]/page.tsx`
- Modify: `apps/web/lib/plan-form-source.test.ts`

**Interfaces:**
- Consumes:
  - `generateTemplateSettingsFromWebsiteAction`
  - `saveTemplateSettingsDraftAction`
  - `approveTemplateSettingsAction`
  - `renderOutboundEmailHtml`
- Produces:
  - `<TemplateSettingsPanel />` server component used by plan detail.

- [ ] **Step 1: Write failing source test**

Modify `apps/web/lib/plan-form-source.test.ts`:

```ts
  it("exposes branding template setup with textarea fields", () => {
    const source = readFileSync("app/plans/[id]/page.tsx", "utf8");
    const panelSource = readFileSync("components/template-settings-panel.tsx", "utf8");

    assert.match(source, /TemplateSettingsPanel/);
    assert.match(panelSource, /Gerar pelo site/);
    assert.match(panelSource, /Aprovar template/);
    assert.match(panelSource, /<Textarea\s+name="signature"/);
    assert.match(panelSource, /<Textarea\s+name="offerSummary"/);
    assert.match(panelSource, /<Textarea\s+name="valueProposition"/);
  });
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
corepack pnpm --filter @repo/web test -- plan-form-source.test.ts
```

Expected: fails because component does not exist.

- [ ] **Step 3: Create panel component**

Create `apps/web/components/template-settings-panel.tsx`:

```tsx
import { Field, Input, Textarea } from "@repo/ui";
import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { SectionCard, SectionTitle, StatusPill } from "@/components/flow-ui";
import {
  approveTemplateSettingsAction,
  generateTemplateSettingsFromWebsiteAction,
  saveTemplateSettingsDraftAction,
} from "@/lib/actions";
import { renderOutboundEmailHtml } from "@/lib/email-template";

type SettingsRecord = {
  id: string;
  status: string;
  isActive: boolean;
  websiteUrl: string | null;
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  fontFamily: string | null;
  senderName: string | null;
  senderRole: string | null;
  signature: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  offerSummary: string | null;
  valueProposition: string | null;
  tone: string | null;
};

export function TemplateSettingsPanel({
  planId,
  currentOffer,
  draft,
  approved,
}: {
  planId: string;
  currentOffer: string | null;
  draft: SettingsRecord | null;
  approved: SettingsRecord | null;
}) {
  const settings = draft ?? approved;
  const previewHtml = renderOutboundEmailHtml({
    subject: "Preview do template",
    body: "Olá,\n\nEsta é uma prévia visual do email outbound usando o template aprovado ou o rascunho atual.",
    settings,
  });
  const offerSuggestion = settings?.offerSummary ?? "";
  const canApplyOffer = !currentOffer?.trim() && !!offerSuggestion;

  return (
    <SectionCard id="branding-template">
      <SectionTitle
        title="Branding e template"
        description="Gere settings pelo site, revise a oferta e aprove antes de usar no Brevo."
      />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-5">
          <ActionForm
            action={generateTemplateSettingsFromWebsiteAction.bind(null, planId)}
            submitLabel="Gerar pelo site"
          >
            <Field label="Website da sua empresa">
              <Input
                name="websiteUrl"
                defaultValue={settings?.websiteUrl ?? ""}
                placeholder="https://suaempresa.com"
              />
            </Field>
          </ActionForm>

          <ActionForm
            action={saveTemplateSettingsDraftAction.bind(null, planId)}
            submitLabel="Salvar rascunho"
          >
            {draft?.id && <input type="hidden" name="settingsId" value={draft.id} />}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome da marca">
                <Input name="brandName" defaultValue={settings?.brandName ?? ""} />
              </Field>
              <Field label="Logo URL">
                <Input name="logoUrl" defaultValue={settings?.logoUrl ?? ""} />
              </Field>
              <Field label="Cor primária">
                <Input name="primaryColor" placeholder="#111111" defaultValue={settings?.primaryColor ?? ""} />
              </Field>
              <Field label="Cor de destaque">
                <Input name="accentColor" placeholder="#555555" defaultValue={settings?.accentColor ?? ""} />
              </Field>
              <Field label="Cor de fundo">
                <Input name="backgroundColor" placeholder="#F6F7F9" defaultValue={settings?.backgroundColor ?? ""} />
              </Field>
              <Field label="Fonte">
                <Input name="fontFamily" placeholder="Arial" defaultValue={settings?.fontFamily ?? ""} />
              </Field>
              <Field label="Remetente">
                <Input name="senderName" defaultValue={settings?.senderName ?? ""} />
              </Field>
              <Field label="Cargo do remetente">
                <Input name="senderRole" defaultValue={settings?.senderRole ?? ""} />
              </Field>
              <Field label="CTA label">
                <Input name="ctaLabel" defaultValue={settings?.ctaLabel ?? ""} />
              </Field>
              <Field label="CTA URL">
                <Input name="ctaUrl" defaultValue={settings?.ctaUrl ?? ""} />
              </Field>
            </div>
            <Field label="Assinatura">
              <Textarea name="signature" defaultValue={settings?.signature ?? ""} />
            </Field>
            <Field label="Oferta resumida">
              <Textarea name="offerSummary" defaultValue={offerSuggestion} />
            </Field>
            {offerSuggestion && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="applyOffer" />
                {canApplyOffer
                  ? 'Usar esta sugestão para preencher "O que você vende (oferta)".'
                  : 'Substituir a oferta atual por esta sugestão.'}
              </label>
            )}
            <Field label="Proposta de valor">
              <Textarea name="valueProposition" defaultValue={settings?.valueProposition ?? ""} />
            </Field>
            <Field label="Tom">
              <Textarea name="tone" defaultValue={settings?.tone ?? ""} />
            </Field>
          </ActionForm>

          <div className="flex flex-wrap items-center gap-2">
            {approved ? <StatusPill variant="solid">template aprovado</StatusPill> : <StatusPill variant="outline">sem template aprovado</StatusPill>}
            {draft && (
              <ActionButton
                action={approveTemplateSettingsAction.bind(null, planId, draft.id)}
                label="Aprovar template"
                pendingLabel="aprovando..."
              />
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <div className="border-b border-border/70 px-4 py-2 text-xs font-semibold text-muted-foreground">
            Preview HTML
          </div>
          <iframe
            title="Preview do template de outbound"
            srcDoc={previewHtml}
            sandbox=""
            referrerPolicy="no-referrer"
            className="h-[520px] w-full bg-white"
          />
        </div>
      </div>
    </SectionCard>
  );
}
```

- [ ] **Step 4: Load settings in plan detail**

Modify `apps/web/app/plans/[id]/page.tsx`.

Add import:

```ts
import { TemplateSettingsPanel } from "@/components/template-settings-panel";
```

Update plan include:

```ts
businessProfile: true,
workspace: {
  include: {
    emailTemplateSettings: {
      orderBy: { updatedAt: "desc" },
    },
  },
},
```

Add after `primary`:

```ts
const draftTemplateSettings =
  plan.workspace.emailTemplateSettings.find((settings) => settings.status === "DRAFT") ??
  null;
const approvedTemplateSettings =
  plan.workspace.emailTemplateSettings.find(
    (settings) => settings.status === "APPROVED" && settings.isActive,
  ) ?? null;
```

Render after the ICP section:

```tsx
<TemplateSettingsPanel
  planId={plan.id}
  currentOffer={plan.businessProfile?.offer ?? null}
  draft={draftTemplateSettings}
  approved={approvedTemplateSettings}
/>
```

- [ ] **Step 5: Run tests, typecheck, visual smoke**

Run:

```bash
corepack pnpm --filter @repo/web test -- plan-form-source.test.ts
corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false
corepack pnpm --filter @repo/web build
```

Expected: all pass.

If dev server is running, open the first plan page and confirm the panel renders:

```bash
corepack pnpm --filter @repo/web exec tsx -e 'import { chromium } from "playwright"; async function main(){ const browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); await page.goto("http://localhost:3000/plans", { waitUntil: "networkidle" }); const firstPlan = page.locator("a[href^=\"/plans/\"]").first(); const count = await firstPlan.count(); if (!count) { console.log("NO_PLANS"); await browser.close(); return; } await firstPlan.click(); await page.waitForLoadState("networkidle"); const body = await page.locator("body").innerText(); if (!body.includes("Branding e template")) throw new Error("Branding panel missing"); console.log("BRANDING_PANEL_OK"); await browser.close(); } main().catch((error)=>{ console.error(error); process.exit(1); });'
```

Expected: output is `BRANDING_PANEL_OK` when at least one plan exists; output is `NO_PLANS` only in an empty local database.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/template-settings-panel.tsx 'apps/web/app/plans/[id]/page.tsx' apps/web/lib/plan-form-source.test.ts
git commit -m "feat: add branding template review panel"
```

---

### Task 6: Documentation And End-To-End Verification

**Files:**
- Modify: `docs/changes/2026-07-02-plan-first-ui-campaign-flow.md`

**Interfaces:**
- Consumes all tasks.
- Produces updated change documentation and verified app state.

- [ ] **Step 1: Update documentation**

Modify `docs/changes/2026-07-02-plan-first-ui-campaign-flow.md` and add a section:

```md
## Branding e Template de Email

Foi adicionada a primeira fase de setup de template:

- `EmailTemplateSettings` persistido por workspace/perfil de negocio.
- Geracao de rascunho a partir do website da propria empresa.
- Revisao humana antes de aprovacao.
- Sugestao para preencher "O que voce vende (oferta)" sem sobrescrever automaticamente valores existentes.
- Preview HTML com branding.
- Envio via Brevo usando o mesmo template aprovado.

Fora desta fase:

- Refino de campanhas com conteudo do site.
- Editor visual drag-and-drop.
- Templates salvos no painel Brevo.
```

- [ ] **Step 2: Run full test suite**

Run:

```bash
corepack pnpm --filter @repo/web test
corepack pnpm exec tsx --test packages/schemas/src/template-settings.test.ts packages/prompts/src/template-settings-prompt.test.ts
corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false
corepack pnpm --filter @repo/web build
```

Expected: all pass.

- [ ] **Step 3: Manual browser verification**

Start or reuse dev server:

```bash
corepack pnpm --filter @repo/web dev
```

Open `http://localhost:3000/plans`, enter an existing plan, and verify:

- "Branding e template" panel is visible.
- Website field accepts a URL.
- Draft form shows textareas for signature, offer summary, value proposition, and tone.
- Approving a draft changes status to approved.
- Company/campaign message previews still render.
- If approved settings exist, the HTML preview includes branding.

- [ ] **Step 4: Final git status**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing changes remain, or the working tree is clean relative to this plan's commits.

- [ ] **Step 5: Commit docs**

```bash
git add docs/changes/2026-07-02-plan-first-ui-campaign-flow.md
git commit -m "docs: document branding template settings"
```
