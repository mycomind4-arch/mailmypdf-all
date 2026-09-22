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

  test("does not read a decision date as the deadline when the next sentence states the deadline", () => {
    const decision = createDecision("claim_denial", { agency: "Example Insurer", decisionDate: "2026-09-01" });
    const timeline = buildAppealTimeline({
      caseId: "matter-5",
      decision,
      today: "2026-09-10",
      documents: [{
        id: "d1",
        name: "denial.pdf",
        text: "Decision issued September 1, 2026. Appeal due no later than October 1, 2026.",
        pageCount: 1,
        isDecision: true,
        role: "decision",
      }],
    });

    assert.equal(timeline.deadline.deadlineDate, "2026-10-01");
    assert.equal(timeline.deadline.hasPassed, false);
    assert.deepEqual(timeline.deadline.conflictingDates, []);
  });

  test("suggests records that fit the event preceding an unexplained gap", () => {
    const decision = createDecision("claim_denial", { agency: "Example Insurer" });
    const timeline = buildAppealTimeline({
      caseId: "matter-6",
      decision,
      documents: [{
        id: "n1",
        name: "notes.pdf",
        text: "A hearing was held on February 2, 2026. Records were submitted on May 20, 2026.",
        pageCount: 1,
        isDecision: false,
        role: "evidence",
      }],
    });

    assert.equal(timeline.gaps.length, 1);
    assert.ok(timeline.gaps[0]!.potentiallyUsefulRecords.includes("hearing transcript"));
  });

  test("does not treat same-type events months apart as a date conflict", () => {
    const decision = createDecision("claim_denial", { agency: "Example Insurer" });
    const timeline = buildAppealTimeline({
      caseId: "matter-3",
      decision,
      documents: [
        { id: "r1", name: "receipt-march.pdf", text: "Medical records were submitted on March 3, 2026.", pageCount: 1, isDecision: false, role: "evidence" },
        { id: "r2", name: "receipt-sept.pdf", text: "Additional records were submitted on September 8, 2026.", pageCount: 1, isDecision: false, role: "evidence" },
      ],
    });

    assert.equal(timeline.conflicts.length, 0);
  });

  test("does not report differing decision or deadline dates as timeline conflicts", () => {
    const decision = createDecision("claim_denial", { agency: "Example Insurer" });
    const timeline = buildAppealTimeline({
      caseId: "matter-4",
      decision,
      documents: [
        { id: "d1", name: "initial-denial.pdf", text: "Initial determination issued May 2, 2026. Appeal due no later than June 1, 2026.", pageCount: 1, isDecision: true, role: "decision" },
        { id: "d2", name: "reconsideration.pdf", text: "Reconsideration determination issued June 20, 2026. Appeal due no later than August 19, 2026.", pageCount: 1, isDecision: true, role: "decision" },
      ],
    });

    assert.equal(timeline.conflicts.length, 0);
    assert.deepEqual(timeline.deadline.conflictingDates, ["2026-06-01", "2026-08-19"]);
    assert.match(timeline.deadline.warning ?? "", /different appeal deadlines/);
  });
});
