import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const baselineMigration =
  "../../packages/db/prisma/migrations/20260702193000_baseline/migration.sql";
const templateSettingsMigration =
  "../../packages/db/prisma/migrations/20260702194000_email_template_settings/migration.sql";

describe("database migrations", () => {
  it("keeps the template settings migration additive for existing databases", () => {
    const baseline = readFileSync(baselineMigration, "utf8");
    const templateSettings = readFileSync(templateSettingsMigration, "utf8");

    assert.match(baseline, /CREATE TABLE "Workspace"/);
    assert.doesNotMatch(baseline, /EmailTemplateSettings/);

    assert.doesNotMatch(templateSettings, /CREATE TABLE "Workspace"/);
    assert.doesNotMatch(templateSettings, /CREATE TABLE "Plan"/);
    assert.match(templateSettings, /CREATE TYPE "TemplateSettingsStatus"/);
    assert.match(templateSettings, /CREATE TYPE "TemplateSettingsSource"/);
    assert.match(templateSettings, /CREATE TABLE "EmailTemplateSettings"/);
    assert.match(
      templateSettings,
      /EmailTemplateSettings_one_active_approved_per_workspace_idx/,
    );
  });
});
