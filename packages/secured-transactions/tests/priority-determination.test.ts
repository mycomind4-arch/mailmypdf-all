import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildCompetingInterestMatrix,
  determinePriorityFromRule,
} from "../src/priority/index.js";

const source = {
  id: "filing-source",
  kind: "filing" as const,
  label: "Synthetic filing source",
};

const priorityRule = {
  status: "resolved" as const,
  jurisdiction: "TEST-1",
  ruleId: "synthetic-priority-rule",
  value: {
    ruleDescription: "Synthetic date comparison",
    requiredRecordFields: ["eventDate"],
    comparisonSteps: [
      {
        field: "eventDate",
        valueType: "date" as const,
        direction: "ascending" as const,
      },
    ],
  },
  authorityRefs: [
    {
      id: "priority-authority",
      title: "Synthetic priority authority",
      jurisdiction: "TEST-1",
    },
  ],
  reasonCodes: [],
  requiresHumanReview: false,
};

const noExceptions = {
  status: "clear" as const,
  applicableExceptionIds: [],
  unresolvedExceptionIds: [],
  sourceRefIds: ["exception-search"],
  authorityRefIds: ["exception-authority"],
  reasons: [],
  requiresHumanReview: false,
  canAutoOverridePriority: false as const,
};

describe("priority determination", () => {
  test("supports first-priority finding only from configured comparison", () => {
    const matrix = buildCompetingInterestMatrix([
      {
        id: "subject",
        claimantEntityId: "secured-party-a",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-01-01",
        sourceRefs: [source],
      },
      {
        id: "competitor",
        claimantEntityId: "secured-party-b",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-02-01",
        sourceRefs: [source],
      },
    ]);

    const result = determinePriorityFromRule({
      matrix,
      rule: priorityRule,
      exceptionAssessment: noExceptions,
      subjectRecordId: "subject",
    });

    assert.equal(
      result.status,
      "evidence-supports-first-priority",
    );

    assert.equal(
      result.priorityLegallyDetermined,
      false,
    );

    assert.equal(
      result.canProceedToConsequentialAction,
      false,
    );

    assert.equal(
      result.requiresHumanReview,
      true,
    );
  });

  test("does not claim first priority when another record ranks first", () => {
    const matrix = buildCompetingInterestMatrix([
      {
        id: "subject",
        claimantEntityId: "secured-party-a",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-03-01",
        sourceRefs: [source],
      },
      {
        id: "competitor",
        claimantEntityId: "secured-party-b",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-01-01",
        sourceRefs: [source],
      },
    ]);

    const result = determinePriorityFromRule({
      matrix,
      rule: priorityRule,
      exceptionAssessment: noExceptions,
      subjectRecordId: "subject",
    });

    assert.equal(
      result.status,
      "evidence-supports-not-first-priority",
    );
  });

  test("ties require human review", () => {
    const matrix = buildCompetingInterestMatrix([
      {
        id: "subject",
        claimantEntityId: "secured-party-a",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-01-01",
        sourceRefs: [source],
      },
      {
        id: "competitor",
        claimantEntityId: "secured-party-b",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-01-01",
        sourceRefs: [source],
      },
    ]);

    const result = determinePriorityFromRule({
      matrix,
      rule: priorityRule,
      exceptionAssessment: noExceptions,
      subjectRecordId: "subject",
    });

    assert.equal(
      result.status,
      "human-review-required",
    );
  });

  test("applicable exceptions block ordinary ranking", () => {
    const matrix = buildCompetingInterestMatrix([
      {
        id: "subject",
        claimantEntityId: "secured-party-a",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-01-01",
        sourceRefs: [source],
      },
    ]);

    const result = determinePriorityFromRule({
      matrix,
      rule: priorityRule,
      exceptionAssessment: {
        ...noExceptions,
        status: "exception-applies",
        applicableExceptionIds: ["special-rule"],
        reasons: ["Special rule requires review."],
        requiresHumanReview: true,
      },
      subjectRecordId: "subject",
    });

    assert.equal(
      result.status,
      "human-review-required",
    );
  });
});
