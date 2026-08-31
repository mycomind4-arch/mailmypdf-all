import test from "node:test";
import assert from "node:assert/strict";
import { createAppeal, isReadyToMail } from "../src/domain/appeal";
import { createDecision } from "../src/domain/decision";

function review(score: number, issuesRequiringAttention: number) {
  return {
    score,
    checks: [],
    issuesRequiringAttention,
    generatedAt: new Date().toISOString(),
  };
}

test("mail readiness always requires explicit ready status", () => {
  const appeal = createAppeal("denied-claim", createDecision("claim_denial"));
  appeal.review = review(90, 0);
  assert.equal(isReadyToMail(appeal), false);
  appeal.status = "ready";
  assert.equal(isReadyToMail(appeal), true);
});

test("mail readiness accepts the strict no-issues path", () => {
  const appeal = createAppeal("denied-claim", createDecision("claim_denial"));
  appeal.status = "ready";
  appeal.review = review(60, 0);
  assert.equal(isReadyToMail(appeal), true);
});

test("mail readiness accepts the higher-score low-issues path", () => {
  const appeal = createAppeal("denied-claim", createDecision("claim_denial"));
  appeal.status = "ready";
  appeal.review = review(80, 2);
  assert.equal(isReadyToMail(appeal), true);
});

test("mail readiness rejects weak or unresolved review", () => {
  const appeal = createAppeal("denied-claim", createDecision("claim_denial"));
  appeal.status = "ready";
  appeal.review = review(79, 2);
  assert.equal(isReadyToMail(appeal), false);
  appeal.review = review(90, 3);
  assert.equal(isReadyToMail(appeal), false);
});
