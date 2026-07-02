import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("message previews", () => {
  it("uses the shared full preview in company and campaign message lists", () => {
    const companySource = readFileSync("app/companies/[id]/page.tsx", "utf8");
    const campaignSource = readFileSync("app/campaigns/[id]/page.tsx", "utf8");

    assert.match(companySource, /MessagePreviewCard/);
    assert.match(campaignSource, /MessagePreviewCard/);
    assert.doesNotMatch(companySource, /line-clamp-3[\s\S]{0,160}message\.body/);
    assert.doesNotMatch(campaignSource, /line-clamp-1[\s\S]{0,160}message\.body/);
  });

  it("uses the same email template helper when sending through Brevo", () => {
    const actionsSource = readFileSync("lib/actions.ts", "utf8");

    assert.match(actionsSource, /renderOutboundEmailText/);
    assert.match(actionsSource, /renderOutboundEmailHtml/);
    assert.match(actionsSource, /html,/);
    assert.match(actionsSource, /text,/);
  });
});
