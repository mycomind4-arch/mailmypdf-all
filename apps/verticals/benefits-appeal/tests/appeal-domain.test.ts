import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createAppeal, canPersistMailedStatus, updateAppeal, isReadyToMail } from "../src/domain/appeal";
import { createDecision } from "../src/domain/decision";

const mockDecision = createDecision("government_benefit", {
  agency: "SSA",
  referenceNumber: "ABC-123",
  decisionDate: "2026-08-01",
  deadline: { date: "2026-10-01", type: "appeal", source: "extracted" },
  reasons: [{ id: "r1", text: "Insufficient medical evidence", confidence: 0.9 }],
  facts: [{ id: "f1", label: "Decision", value: "Claim denied", source: "extracted", confidence: 0.95 }],
});

describe("Appeal domain", () => {
  test("creates an appeal with draft status", () => {
    const appeal = createAppeal("ssdi-denial", mockDecision);
    assert.equal(appeal.status, "draft");
    assert.equal(appeal.workflowId, "ssdi-denial");
    assert.equal(appeal.decision.agency, "SSA");
  });

  test("blocks mailed status without provider fulfillment evidence", () => {
    const appeal = createAppeal("ssdi-denial", mockDecision);
    assert.equal(canPersistMailedStatus(appeal), false);
    assert.throws(() => updateAppeal(appeal, { status: "mailed" }));
  });

  test("is not ready to mail without review", () => {
    const appeal = createAppeal("ssdi-denial", mockDecision);
    assert.equal(isReadyToMail(appeal), false);
  });
});
