import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("plan marketing material forms", () => {
  it("uses textareas for long-form onboarding fields", () => {
    const source = readFileSync("app/plans/page.tsx", "utf8");

    assert.match(source, /Textarea/);
    assert.match(source, /<Textarea\s+name="offer"/);
    assert.match(source, /<Textarea\s+name="valueProp"/);
    assert.match(source, /<Textarea\s+name="objective"/);
  });

  it("uses textareas for long-form ICP editing fields", () => {
    const source = readFileSync("app/plans/[id]/page.tsx", "utf8");

    assert.match(source, /Textarea/);
    assert.match(source, /<Textarea\s+name="objective"/);
    assert.match(source, /<Textarea\s+name="valueProp"/);
    assert.match(source, /<Textarea\s+name="painPoints"/);
    assert.match(source, /<Textarea\s+name="value"/);
  });

  it("uses a textarea for sequence step objectives", () => {
    const source = readFileSync("app/campaigns/[id]/page.tsx", "utf8");

    assert.match(source, /Textarea/);
    assert.match(source, /<Textarea\s+name="template"/);
  });

  it("exposes branding template setup with textarea fields", () => {
    const source = readFileSync("app/plans/[id]/page.tsx", "utf8");
    const panelSource = readFileSync(
      "components/template-settings-panel.tsx",
      "utf8",
    );

    assert.match(source, /TemplateSettingsPanel/);
    assert.match(panelSource, /Gerar pelo site/);
    assert.match(panelSource, /Aprovar template/);
    assert.match(panelSource, /<Textarea\s+name="signature"/);
    assert.match(panelSource, /<Textarea\s+name="offerSummary"/);
    assert.match(panelSource, /<Textarea\s+name="valueProposition"/);
  });
});
