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
