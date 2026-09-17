import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildAppealTimeline, createDecision } from "../src/appeal/index.js";

describe("Appeal timeline adapter", () => {
  test("derives a document-stated appeal period through the shared deadline engine", () => {
    const decision = createDecision("claim_denial", {
      agency: "Example Insurer",
      decisionDate: "2026-09-01",
      documentId: "decision-1",
      documentFilename: "denial.pdf",
    });

    const timeline = buildAppealTimeline({
      caseId: "matter-1",
      decision,
      today: "2026-09-17",
      documents: [{
        id: "decision-1",
        name: "denial.pdf",
        text: "Decision issued September 1, 2026. You must file your appeal within 30 days of the decision.",
        pageCount: 1,
        isDecision: true,
        role: "decision",
      }],
    });

    assert.equal(timeline.deadline.deadlineDate, "2026-10-01");
    assert.equal(timeline.deadline.source, "rule_derived");
    assert.equal(timeline.deadline.daysRemaining, 14);
    assert.equal(timeline.deadline.isReliable, false);
    assert.match(timeline.deadline.warning ?? "", /Verify/);
  });

  test("keeps conflicting source dates visible instead of silently choosing one", () => {
    const decision = createDecision("claim_denial", { agency: "Example Insurer" });
    const timeline = buildAppealTimeline({
      caseId: "matter-2",
      decision,
      documents: [
        {
          id: "receipt-1",
          name: "receipt.pdf",
          text: "The application was filed on August 1, 2026.",
          pageCount: 1,
          isDecision: false,
          role: "evidence",
        },
        {
          id: "agency-1",
          name: "agency-letter.pdf",
          text: "The application was filed on August 5, 2026.",
          pageCount: 1,
          isDecision: false,
          role: "correspondence",
        },
      ],
    });

    assert.ok(timeline.conflicts.length >= 1);
    assert.ok(timeline.conflicts.some((conflict) => conflict.claims.some((claim) => claim.date === "2026-08-01")));
    assert.ok(timeline.conflicts.some((conflict) => conflict.claims.some((claim) => claim.date === "2026-08-05")));
  });
});
