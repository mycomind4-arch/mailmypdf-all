import assert from "node:assert/strict";
import test from "node:test";
import { composePriorityStrategy } from "../workflow-composition";

test("priority strategy blocks incomplete evidence before any ranking claim", () => {
  const result = composePriorityStrategy({
    records: [],
    rule: { status: "unsupported", jurisdiction: "DE", reasonCodes: ["fixture-no-rule"], requiresHumanReview: false },
  });
  assert.equal(result.status, "unsupported");
  assert.equal(result.priorityLegallyDetermined, false);
  assert.equal(result.consequentialActionAllowed, false);
});
