import assert from "node:assert/strict";
import test from "node:test";
import { canEnterMailing, canEnterReview, strictValidationSummary } from "../src/domain/strict-runtime-gate.ts";

const base = {
  draft: "Response draft",
  draftValidation: { passed: true, errors: 0, warnings: 0, findings: [] },
  reviewChecks: [true, true],
  approved: true,
  mailing: { method: "certified", recipient: { name: "A", org: "B", address1: "1 Main", address2: "", city: "City", state: "CA", zip: "90210" }, status: "draft" },
};

test("strict review gate fails closed when validation has not run", () => {
  assert.equal(canEnterReview({ draft: base.draft, draftValidation: null }), false);
  assert.deepEqual(strictValidationSummary(null), { ready: false, reason: "Draft validation has not run." });
});

test("strict review gate rejects failed validation", () => {
  assert.equal(canEnterReview({ draft: base.draft, draftValidation: { ...base.draftValidation, passed: false, errors: 1 } }), false);
  assert.deepEqual(strictValidationSummary({ ...base.draftValidation, passed: false, errors: 2 }), {
    ready: false,
    reason: "Draft validation failed with 2 error(s).",
  });
});

test("strict mailing gate requires validation, approval, all review checks, and mailing state", () => {
  assert.equal(canEnterMailing(base), true);
  assert.equal(canEnterMailing({ ...base, approved: false }), false);
  assert.equal(canEnterMailing({ ...base, reviewChecks: [true, false] }), false);
  assert.equal(canEnterMailing({ ...base, mailing: null }), false);
});
