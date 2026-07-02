import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getCompanyPrimaryAction,
  getPlanPrimaryAction,
  getStageIndex,
} from "./flow";

describe("flow helpers", () => {
  it("returns discovery as the primary action for a ready plan without a run", () => {
    assert.deepEqual(
      getPlanPrimaryAction({
        hasCountry: true,
        segmentCount: 1,
        hasDiscoveryRun: false,
        discoveryActive: false,
        hasResults: false,
      }),
      { label: "Descobrir empresas", stage: "discovery" },
    );
  });

  it("returns refinement as the primary action after discovery has results", () => {
    assert.deepEqual(
      getPlanPrimaryAction({
        hasCountry: true,
        segmentCount: 2,
        hasDiscoveryRun: true,
        discoveryActive: false,
        hasResults: true,
      }),
      { label: "Refinar melhores", stage: "refinement" },
    );
  });

  it("returns the next company action from available truth layers", () => {
    assert.deepEqual(
      getCompanyPrimaryAction({
        hasDomain: true,
        hasResearch: true,
        hasGeneratedEnrichment: false,
        hasApprovedEnrichment: false,
        hasCampaignMessage: false,
      }),
      { label: "Enriquecer (IA)", stage: "refinement" },
    );
  });

  it("maps stages to the shared stepper positions", () => {
    assert.equal(getStageIndex("icp"), 0);
    assert.equal(getStageIndex("discovery"), 1);
    assert.equal(getStageIndex("refinement"), 2);
    assert.equal(getStageIndex("campaign"), 3);
    assert.equal(getStageIndex("send"), 4);
  });
});
