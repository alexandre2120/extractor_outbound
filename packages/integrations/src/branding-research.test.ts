import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("extractTemplateSettings", () => {
  it("parses and normalizes extracted template settings from KIE JSON", async () => {
    const { extractTemplateSettings } = await import(`./index.ts?case=extract-${Date.now()}`);
    const fakeKie = {
      async chatJson() {
        return {
          data: {
            brandName: "Example",
            websiteUrl: "https://example.com",
            logoUrl: "http://example.com/logo.svg",
            primaryColor: " #aa11cc ",
            accentColor: "#00ff00",
            backgroundColor: "not-a-color",
            ctaUrl: "https://example.com/demo",
            evidenceRefs: ["https://example.com"],
          },
          creditsConsumed: 17,
        };
      },
    };

    const parsed = await extractTemplateSettings(fakeKie as never, {
      websiteUrl: "https://example.com",
      evidence: "[home] Example books meetings.",
      logoCandidates: ["https://example.com/logo.svg"],
      colorCandidates: ["#AA11CC"],
    });

    assert.equal(parsed.creditsConsumed, 17);
    assert.equal(parsed.result.primaryColor, "#AA11CC");
    assert.equal(parsed.result.accentColor, "#00FF00");
    assert.equal(parsed.result.backgroundColor, null);
    assert.equal(parsed.result.logoUrl, null);
    assert.equal(parsed.result.ctaUrl, "https://example.com/demo");
  });
});

describe("researchBrandingWebsite", () => {
  it("returns fallback html evidence when Playwright fails but homepage fetch succeeds", async () => {
    const { researchBrandingWebsiteWithDeps } = await import("./branding-research");
    const result = await researchBrandingWebsiteWithDeps(
      "example.com",
      {},
      {
        runResearchPlaywright: async () => {
          throw new Error("playwright launch failed");
        },
        fetch: async () =>
      new Response(
        `
          <html>
            <head>
              <title>Example</title>
              <meta name="description" content="Book qualified meetings." />
              <link rel="icon" href="/logo.svg" />
            </head>
            <body>
              <img src="/logo.svg" alt="Example logo" />
              <section style="color:#12ab34;background:#ffffff">Revenue teams win.</section>
            </body>
          </html>
        `,
        { status: 200, headers: { "content-type": "text/html" } },
      ),
      },
    );

    assert.equal(result.engine, "fallback");
    assert.equal(result.websiteUrl, "https://example.com");
    assert.match(result.evidence, /\[title\] Example/);
    assert.match(result.evidence, /\[meta\] Book qualified meetings\./);
    assert.deepEqual(result.logoCandidates, ["https://example.com/logo.svg"]);
    assert.deepEqual(result.colorCandidates, ["#12AB34", "#FFFFFF"]);
  });

  it("dedupes logo candidates before slicing on the playwright path", async () => {
    const { researchBrandingWebsiteWithDeps } = await import("./branding-research");
    const result = await researchBrandingWebsiteWithDeps(
      "example.com",
      {},
      {
        runResearchPlaywright: async () => ({
          domainValidated: true,
          pagesVisited: ["https://example.com"],
          factualSummary: "[home] Example wins.",
          qualityScore: 88,
          evidence: Array.from({ length: 10 }, (_, index) => ({
            url: `https://example.com/page-${index}`,
            extracted:
              index < 6
                ? "https://example.com/logo.svg"
              : `https://example.com/logo-${index}.svg`,
          })),
        }),
        fetch: async () =>
      new Response(
        `
          <html>
            <head><title>Example</title></head>
            <body>
              <img src="/logo.svg" alt="Example logo" />
            </body>
          </html>
        `,
        { status: 200, headers: { "content-type": "text/html" } },
      ),
      },
    );

    assert.equal(result.engine, "playwright");
    assert.equal(result.logoCandidates[0], "https://example.com/logo.svg");
    assert.equal(new Set(result.logoCandidates).size, result.logoCandidates.length);
    assert.equal(result.logoCandidates.length, 5);
  });
});
