import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDefaultRefinementSelection,
  getVisibleRankingRows,
} from "./ranking";

const rows = [
  { id: "1", tier: "A", hasEmail: true, score: 91 },
  { id: "2", tier: "B", hasEmail: false, score: 76 },
  { id: "3", tier: "C", hasEmail: true, score: 54 },
  { id: "4", tier: null, hasEmail: true, score: null },
];

describe("ranking helpers", () => {
  it("filters rows by email and tier while preserving score order", () => {
    assert.deepEqual(
      getVisibleRankingRows(rows, { emailOnly: true, tier: "all" }).map(
        (row) => row.id,
      ),
      ["1", "3", "4"],
    );

    assert.deepEqual(
      getVisibleRankingRows(rows, { emailOnly: false, tier: "B" }).map(
        (row) => row.id,
      ),
      ["2"],
    );
  });

  it("preselects tier A and B companies with e-mail for refinement", () => {
    assert.deepEqual(getDefaultRefinementSelection(rows), ["1"]);
  });
});
