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

  it("normalizes color and url fields at runtime", () => {
    const parsed = extractedTemplateSettingsOutput.parse({
      websiteUrl: "https://example.com",
      primaryColor: "  #a1b2c3 ",
      accentColor: "#abcdef",
      backgroundColor: "#123456",
      logoUrl: "https://example.com/assets/logo.svg",
      ctaUrl: "https://example.com/book",
    });

    assert.equal(parsed.primaryColor, "#A1B2C3");
    assert.equal(parsed.accentColor, "#ABCDEF");
    assert.equal(parsed.backgroundColor, "#123456");
    assert.equal(parsed.logoUrl, "https://example.com/assets/logo.svg");
    assert.equal(parsed.ctaUrl, "https://example.com/book");
  });

  it("nulls malformed color and non-https url fields", () => {
    const parsed = extractedTemplateSettingsOutput.parse({
      websiteUrl: "https://example.com",
      primaryColor: "#abcd",
      accentColor: "blue",
      backgroundColor: "#12345g",
      logoUrl: "http://example.com/logo.png",
      ctaUrl: "javascript:alert(1)",
    });

    assert.equal(parsed.primaryColor, null);
    assert.equal(parsed.accentColor, null);
    assert.equal(parsed.backgroundColor, null);
    assert.equal(parsed.logoUrl, null);
    assert.equal(parsed.ctaUrl, null);
  });

  it("rejects malformed extraction payloads", () => {
    assert.throws(() => extractedTemplateSettingsOutput.parse({ brandName: "No URL" }));
  });
});
