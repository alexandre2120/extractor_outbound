import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSelectedCompanyPrepIds,
  getSelectedCompanyReadiness,
  type SelectedCompanyInput,
} from "./selected-companies";

const companies: SelectedCompanyInput[] = [
  {
    id: "co_ready",
    name: "Ready",
    domain: "ready.test",
    email: "hello@ready.test",
    websiteSummary: "facts",
    researchStatuses: ["DONE"],
    enrichmentStatuses: ["APPROVED"],
  },
  {
    id: "co_approve",
    name: "Approve",
    domain: "approve.test",
    email: null,
    websiteSummary: "facts",
    researchStatuses: ["DONE"],
    enrichmentStatuses: ["GENERATED"],
  },
  {
    id: "co_enrich",
    name: "Enrich",
    domain: "enrich.test",
    email: null,
    websiteSummary: "facts",
    researchStatuses: ["DONE"],
    enrichmentStatuses: [],
  },
  {
    id: "co_research",
    name: "Research",
    domain: "research.test",
    email: null,
    websiteSummary: null,
    researchStatuses: [],
    enrichmentStatuses: [],
  },
  {
    id: "co_blocked",
    name: "Blocked",
    domain: null,
    email: null,
    websiteSummary: null,
    researchStatuses: [],
    enrichmentStatuses: [],
  },
];

describe("selected company readiness", () => {
  it("groups selected companies by next required action", () => {
    assert.deepEqual(getSelectedCompanyReadiness(companies), {
      ready: ["co_ready"],
      needsApproval: ["co_approve"],
      needsEnrichment: ["co_enrich"],
      needsResearch: ["co_research"],
      blocked: ["co_blocked"],
    });
  });

  it("returns ids that can be prepared in bulk", () => {
    assert.deepEqual(getSelectedCompanyPrepIds(companies), {
      approveIds: ["co_approve"],
      enrichIds: ["co_enrich"],
      researchIds: ["co_research"],
    });
  });
});
