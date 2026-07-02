import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("root layout hydration", () => {
  it("suppresses body attribute mismatches caused by browser extensions", () => {
    const layoutSource = readFileSync("app/layout.tsx", "utf8");

    assert.match(layoutSource, /<body\s+suppressHydrationWarning/);
  });
});
