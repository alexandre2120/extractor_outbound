import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("message previews", () => {
  function getFunctionSource(source: string, name: string, nextName: string) {
    const start = source.indexOf(`export async function ${name}(`);
    const end = source.indexOf(`export async function ${nextName}(`, start);

    assert.ok(start >= 0, `${name} should exist`);
    assert.ok(end > start, `${nextName} should follow ${name}`);

    return source.slice(start, end);
  }

  function getSendMessageActionSource(actionsSource: string) {
    return getFunctionSource(
      actionsSource,
      "sendMessageAction",
      "generateTemplateSettingsFromWebsiteAction",
    );
  }

  function getPlanForTemplateSettingsSource(actionsSource: string) {
    const start = actionsSource.indexOf("async function getPlanForTemplateSettings(");
    const end = actionsSource.indexOf("// --- Onboarding / Plan", start);

    assert.ok(start >= 0);
    assert.ok(end > start);

    return actionsSource.slice(start, end);
  }

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

  it("loads active approved settings for message preview and Brevo send", () => {
    const companySource = readFileSync("app/companies/[id]/page.tsx", "utf8");
    const campaignSource = readFileSync("app/campaigns/[id]/page.tsx", "utf8");
    const actionsSource = readFileSync("lib/actions.ts", "utf8");
    const sendMessageActionSource = getSendMessageActionSource(actionsSource);

    assert.match(companySource, /emailTemplateSettings/);
    assert.match(companySource, /isActive:\s*true/);
    assert.match(campaignSource, /emailTemplateSettings/);
    assert.match(campaignSource, /isActive:\s*true/);
    assert.match(sendMessageActionSource, /emailTemplateSettings/);
    assert.match(sendMessageActionSource, /TemplateSettingsStatus\.APPROVED/);
    assert.match(sendMessageActionSource, /isActive:\s*true/);
    assert.match(
      sendMessageActionSource,
      /message\.company\.workspace\.emailTemplateSettings\[0\]/,
    );
    assert.match(
      sendMessageActionSource,
      /renderOutboundEmailHtml\([\s\S]*?settings:\s*message\.company\.workspace\.emailTemplateSettings\[0\]\s*\?\?\s*null/s,
    );
  });

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

  it("keeps the template generation plan lookup inside the action try block", () => {
    const actionsSource = readFileSync("lib/actions.ts", "utf8");
    const start = actionsSource.indexOf("export async function generateTemplateSettingsFromWebsiteAction(");
    const end = actionsSource.indexOf("export async function saveTemplateSettingsDraftAction(", start);
    const functionSource = actionsSource.slice(start, end);
    const tryIndex = functionSource.indexOf("try {");
    const planIndex = functionSource.indexOf("const plan = await getPlanForTemplateSettings(planId);");

    assert.ok(tryIndex >= 0);
    assert.ok(planIndex > tryIndex, "plan lookup should be inside the try block");
  });

  it("passes the current business profile offer into suggested-offer application", () => {
    const actionsSource = readFileSync("lib/actions.ts", "utf8");

    assert.match(
      actionsSource,
      /shouldApplySuggestedOffer\(plan\.businessProfile\?\.offer,\s*applyOffer\)/,
    );
  });

  it("checks updated draft row count before reporting save success", () => {
    const actionsSource = readFileSync("lib/actions.ts", "utf8");

    assert.match(actionsSource, /const updated = await tx\.emailTemplateSettings\.updateMany\(/);
    assert.match(actionsSource, /updated\.count === 0/);
    assert.match(actionsSource, /Template não encontrado\./);
  });

  it("deactivates workspace settings before activating the approved one", () => {
    const actionsSource = readFileSync("lib/actions.ts", "utf8");

    assert.match(
      actionsSource,
      /await prisma\.\$transaction\(\[\s*prisma\.emailTemplateSettings\.updateMany\(\{[\s\S]*?isActive:\s*false[\s\S]*?prisma\.emailTemplateSettings\.update\(\{[\s\S]*?isActive:\s*true/s,
    );
  });

  it("returns a normal failure result when the template plan lookup fails", () => {
    const actionsSource = readFileSync("lib/actions.ts", "utf8");

    assert.match(actionsSource, /message:\s*"Plano não encontrado\."/);
  });

  it("scopes template settings actions and preview pages to the current workspace", () => {
    const actionsSource = readFileSync("lib/actions.ts", "utf8");
    const planSource = readFileSync("app/plans/[id]/page.tsx", "utf8");
    const companySource = readFileSync("app/companies/[id]/page.tsx", "utf8");
    const campaignSource = readFileSync("app/campaigns/[id]/page.tsx", "utf8");
    const templatePlanLookup = getPlanForTemplateSettingsSource(actionsSource);

    assert.match(templatePlanLookup, /const ws = await getWorkspace\(\)/);
    assert.match(templatePlanLookup, /findFirst\(/);
    assert.match(templatePlanLookup, /workspaceId:\s*ws\.id/);
    assert.match(planSource, /const ws = await getWorkspace\(\)/);
    assert.match(planSource, /workspaceId:\s*ws\.id/);
    assert.match(companySource, /const ws = await getWorkspace\(\)/);
    assert.match(companySource, /workspaceId:\s*ws\.id/);
    assert.match(campaignSource, /workspaceId:\s*ws\.id/);
  });
});
