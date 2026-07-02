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
