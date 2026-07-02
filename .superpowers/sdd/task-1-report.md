# Task 1 Report: Schema And Local Settings Validation

## Status

DONE_WITH_CONCERNS

## Scope Completed

- Updated `packages/db/prisma/schema.prisma` with:
  - `TemplateSettingsStatus`
  - `TemplateSettingsSource`
  - `EmailTemplateSettings`
  - `Workspace.emailTemplateSettings`
  - `BusinessProfile.emailTemplateSettings`
- Updated `packages/schemas/src/index.ts` with:
  - `extractedTemplateSettingsOutput`
  - `ExtractedTemplateSettingsOutput`
- Created `packages/schemas/src/template-settings.test.ts`
- Created `apps/web/lib/template-settings.ts`
- Created `apps/web/lib/template-settings.test.ts`

## TDD Log

### Red

Ran:

```bash
corepack pnpm exec tsx --test packages/schemas/src/template-settings.test.ts
corepack pnpm --filter @repo/web test -- template-settings.test.ts
```

Observed:

- Schema test failed because `extractedTemplateSettingsOutput` was not exported and `parse` was called on `undefined`.
- Web test failed because `apps/web/lib/template-settings.ts` did not exist.

### Green

Implemented the Prisma schema, shared Zod schema, and app helper module exactly per the task brief.

One additional red/green cycle happened in the web helper:

- Initial implementation returned `https://example.com/` for bare domains because `URL#toString()` adds a trailing slash.
- Adjusted `sanitizeHttpsUrl` to return `https://example.com` when the URL is a bare origin with no path/query/hash.

## Verification

Passed:

```bash
corepack pnpm exec tsx --test packages/schemas/src/template-settings.test.ts
corepack pnpm --filter @repo/web test -- template-settings.test.ts
corepack pnpm --filter @repo/web exec tsc --noEmit --incremental false
```

Results:

- Schema test: 2 passed, 0 failed
- Web test run: 25 passed, 0 failed
- TypeScript check: exit code 0

## Prisma Commands

Attempted:

```bash
corepack pnpm db:generate
corepack pnpm db:migrate -- --name email_template_settings
```

Both failed before Prisma generation/migration due the local environment blocking package build scripts:

- `ERR_PNPM_IGNORED_BUILDS`
- Ignored builds included `@prisma/client`, `@prisma/engines`, and `prisma`

Because of that:

- Prisma Client was not regenerated
- No migration was generated
- I did not create a migration by hand

## Concerns

- The required Prisma commands are currently blocked by local `pnpm` build-script approval settings, not by code in this task.
- A real migration file is still missing until that environment issue is resolved and `corepack pnpm db:migrate -- --name email_template_settings` can run successfully.

## Commit

Intended commit message:

```bash
feat: add email template settings schema
```
