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
    assert.equal(shouldApplySuggestedOffer(true), true);
    assert.equal(shouldApplySuggestedOffer(false), false);
  });
});
