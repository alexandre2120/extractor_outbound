import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCampaignSelectionHref,
  getSelectedCompanyIds,
  getSelectedPlanId,
} from "./campaign-selection";

describe("campaign selection helpers", () => {
  it("builds campaign links that preserve selected company ids", () => {
    assert.equal(
      buildCampaignSelectionHref("/campaigns", ["co_1", "co_2"], "plan_1"),
      "/campaigns?companyId=co_1&companyId=co_2&planId=plan_1",
    );
  });

  it("reads repeated selected company ids from search params", () => {
    assert.deepEqual(
      getSelectedCompanyIds({
        companyId: ["co_1", "co_2", "co_1", ""],
      }),
      ["co_1", "co_2"],
    );
  });

  it("reads the selected plan id from search params", () => {
    assert.equal(getSelectedPlanId({ planId: "plan_1" }), "plan_1");
    assert.equal(getSelectedPlanId({ planId: ["plan_2", "plan_3"] }), "plan_2");
  });
});
