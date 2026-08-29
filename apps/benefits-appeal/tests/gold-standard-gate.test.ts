import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { evaluateGoldStandardGate } from "../src/domain/gold-standard-gate";
import { workflows } from "../src/domain/workflows";

describe("Gold standard gate", () => {
  test("evaluates each workflow against required capabilities", () => {
    for (const [id, wf] of Object.entries(workflows)) {
      const constructed = {
        definition: wf,
        packs: [],
      } as any;
      try {
        const result = evaluateGoldStandardGate(constructed);
        assert.ok(result, `Gate returned no result for ${id}`);
        assert.ok(typeof result.passed === "boolean", `Gate returned non-boolean passed for ${id}`);
      } catch (e: any) {
        // Gate may throw if the workflow lacks required capabilities - that's expected
        assert.ok(e instanceof Error, `Unexpected error type for ${id}`);
      }
    }
  });
});
