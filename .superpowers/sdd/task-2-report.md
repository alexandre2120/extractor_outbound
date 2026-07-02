Status: DONE

Summary:
- Added the template settings prompt contract and exported prompt builder/system string from `packages/prompts/src/index.ts`.
- Added the required prompt regression test in `packages/prompts/src/template-settings-prompt.test.ts` following a verified red-green TDD cycle.
- Added `researchBrandingWebsite` plus supporting extraction helpers in `packages/integrations/src/branding-research.ts`.
- Exported branding research and added `extractTemplateSettings` in `packages/integrations/src/index.ts`.

TDD evidence:
- Red: `corepack pnpm exec tsx --test packages/prompts/src/template-settings-prompt.test.ts` failed because `buildTemplateSettingsPrompt` did not exist yet.
- Green: the same test passed after implementing the prompt contract.

Verification:
- `corepack pnpm exec tsx --test packages/prompts/src/template-settings-prompt.test.ts packages/schemas/src/template-settings.test.ts`
- `corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false`

Concerns:
- None.

Fix report (review follow-up):
- Enforced runtime normalization in `extractedTemplateSettingsOutput`: `primaryColor`, `accentColor`, and `backgroundColor` now normalize to uppercase `#RRGGBB` or `null`; `logoUrl` and `ctaUrl` now parse through `new URL(...)` and only preserve `https:` URLs.
- Added focused schema coverage for normalization and invalid-value nulling in `packages/schemas/src/template-settings.test.ts`.
- Added focused integration coverage in `packages/integrations/src/branding-research.test.ts` for `extractTemplateSettings` normalization via a fake KIE client, Playwright failure fallback to homepage HTML evidence, and logo dedupe-before-slice behavior.
- Updated `researchBrandingWebsite` to fetch homepage HTML independently, merge HTML-derived evidence/candidates into the Playwright path, and return `engine: "fallback"` with HTML-derived evidence when Playwright fails but homepage fetch succeeds.

Fix verification:
- `corepack pnpm exec tsx --test packages/schemas/src/template-settings.test.ts packages/prompts/src/template-settings-prompt.test.ts packages/integrations/src/branding-research.test.ts` -> 8 tests passed, 0 failed.
- `corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false` -> passed.

Review fix follow-up:
- Changed the shared nullable string normalization in `packages/schemas/src/index.ts` so whitespace-only extracted values are preprocessed to `null` before strict validation.
- Added a focused regression test in `packages/schemas/src/template-settings.test.ts` that proves blank `brandName`, URL, color, and other optional extracted text fields now parse and normalize to `null`.

TDD red/green evidence:
- Red: `corepack pnpm exec tsx --test packages/schemas/src/template-settings.test.ts` failed on blank extracted fields with Zod `too_small` errors before preprocessing.
- Green: the same focused schema test passed after the preprocessing fix.

Verification:
- `corepack pnpm exec tsx --test packages/schemas/src/template-settings.test.ts` -> passed, 5 tests passed, 0 failed.
- `corepack pnpm exec tsx --test packages/schemas/src/template-settings.test.ts packages/prompts/src/template-settings-prompt.test.ts packages/integrations/src/branding-research.test.ts` -> passed, 9 tests passed, 0 failed.
- `corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false` -> passed.

Concerns:
- None.
