import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNoBenefitsOutcomeClaims,
  canDraftBenefitsAppeal,
  canValidateBenefitsAppeal,
  createBenefitsCase,
  type BenefitsIssue,
} from "../src/benefits/index.ts";

function issue(overrides: Partial<BenefitsIssue> = {}): BenefitsIssue {
  return {
    id: "issue-1",
    statement: "The decision states that benefits were denied.",
    status: "supported",
    evidenceIds: ["evidence-1"],
    authoritativeSources: [],
    ...overrides,
  };
}

test("benefits case requires a decision id and unique structured issues", () => {
  assert.throws(
    () => createBenefitsCase({ decisionId: "", issues: [issue()] }),
    /decision id/i,
  );
  assert.throws(
    () => createBenefitsCase({ decisionId: "decision-1", issues: [issue(), issue()] }),
    /duplicate benefits issue/i,
  );
});

test("drafting fails closed until every included issue is evidence-supported", () => {
  assert.equal(canDraftBenefitsAppeal(createBenefitsCase({ decisionId: "decision-1", issues: [] })), false);
  assert.equal(
    canDraftBenefitsAppeal(
      createBenefitsCase({ decisionId: "decision-1", issues: [issue({ status: "unmapped" })] }),
    ),
    false,
  );
  assert.equal(
    canDraftBenefitsAppeal(
      createBenefitsCase({ decisionId: "decision-1", issues: [issue({ evidenceIds: [] })] }),
    ),
    false,
  );
  assert.equal(
    canDraftBenefitsAppeal(
      createBenefitsCase({
        decisionId: "decision-1",
        issues: [issue(), issue({ id: "issue-2", status: "excluded", evidenceIds: [] })],
      }),
    ),
    true,
  );
});

test("validation refuses authority-pending issues", () => {
  const ready = createBenefitsCase({ decisionId: "decision-1", issues: [issue()] });
  assert.equal(canValidateBenefitsAppeal(ready), true);

  const authorityPending = createBenefitsCase({
    decisionId: "decision-1",
    issues: [issue({ status: "needs_authority" })],
  });
  assert.equal(canValidateBenefitsAppeal(authorityPending), false);
});

test("generated benefits correspondence cannot promise an outcome", () => {
  assert.doesNotThrow(() =>
    assertNoBenefitsOutcomeClaims("I request review of the decision based on the attached records."),
  );
  assert.throws(
    () => assertNoBenefitsOutcomeClaims("You will win this benefits appeal."),
    /unsupported eligibility or outcome claim/i,
  );
  assert.throws(
    () => assertNoBenefitsOutcomeClaims("This definitely entitled claimant must be approved."),
    /unsupported eligibility or outcome claim/i,
  );
});
