import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  explainDeadline,
  explainStrategy,
  explainResponse,
  explainReadiness,
  explainFact,
} from "../src/domain/explainability.ts";

describe("Explainability", () => {
  describe("explainDeadline", () => {
    it("explains an explicit deadline", () => {
      const exp = explainDeadline({
        date: "2026-09-15",
        source: "You must respond by September 15, 2026",
        rule: "explicit",
        certainty: "explicit",
      });
      assert.equal(exp.type, "deadline");
      assert.match(exp.summary, /2026-09-15/);
      assert.ok(exp.steps.length >= 2);
      assert.equal(exp.confidence, "high");
      assert.equal(exp.isVerified, true);
    });

    it("explains a calculated deadline with assumptions", () => {
      const exp = explainDeadline({
        date: "2026-09-15",
        calculationMethod: "30 calendar days from 2026-08-16",
        certainty: "calculated",
        startDate: "2026-08-16",
        daysWindow: 30,
        businessDays: false,
      });
      assert.ok(exp.assumptions.length > 0);
      assert.match(exp.assumptions[0], /2026-08-16/);
      assert.equal(exp.confidence, "medium");
    });

    it("includes business day assumption", () => {
      const exp = explainDeadline({
        date: "2026-09-20",
        certainty: "calculated",
        businessDays: true,
        daysWindow: 30,
        startDate: "2026-08-15",
        calculationMethod: "30 business days from 2026-08-15",
      });
      assert.ok(exp.assumptions.some((a) => a.includes("Business days")));
    });

    it("marks ambiguous deadlines as unverified", () => {
      const exp = explainDeadline({
        date: "2026-09-15",
        certainty: "ambiguous",
      });
      assert.equal(exp.isVerified, false);
      assert.ok(exp.assumptions.some((a) => a.includes("ambiguous")));
    });
  });

  describe("explainStrategy", () => {
    it("explains a strategy with facts and evidence", () => {
      const exp = explainStrategy({
        strategyType: "dispute_factual_allegation",
        strategyLabel: "Dispute Factual Allegation",
        reason: "Contradictions were found between the notice and your evidence.",
        relevantFacts: [{ label: "Amount Owed", value: "$0" }],
        evidence: [{ label: "Bank Statement" }],
        constraints: ["Must respond before deadline"],
        missingInfo: ["Verify mailing date"],
      });
      assert.equal(exp.type, "strategy");
      assert.ok(exp.steps.length >= 4);
      assert.ok(exp.steps.some((s) => s.label === "Relevant facts"));
      assert.ok(exp.steps.some((s) => s.label === "Missing information"));
    });
  });

  describe("explainResponse", () => {
    it("explains why a response was generated", () => {
      const exp = explainResponse({
        userObjective: "Explain the income discrepancy",
        noticeRequirements: ["Respond by September 15, 2026", "Provide supporting documentation"],
        supportingEvidence: [{ label: "W-2 Form" }],
        strategyUsed: "provide_documentation",
        factsIncluded: 5,
        placeholdersRemaining: 0,
      });
      assert.equal(exp.type, "response");
      assert.ok(exp.steps.some((s) => s.label === "User objective"));
      assert.equal(exp.isVerified, true);
      assert.equal(exp.confidence, "high");
    });

    it("marks unverified when placeholders remain", () => {
      const exp = explainResponse({
        noticeRequirements: [],
        supportingEvidence: [],
        strategyUsed: "comply",
        factsIncluded: 3,
        placeholdersRemaining: 2,
      });
      assert.equal(exp.isVerified, false);
      assert.equal(exp.confidence, "medium");
    });
  });

  describe("explainReadiness", () => {
    it("explains readiness state and score", () => {
      const exp = explainReadiness({
        state: "needs_review",
        score: 65,
        issuesCount: 3,
        blockingCount: 0,
        topIssues: ["Deadline not confirmed", "No evidence attached"],
      });
      assert.equal(exp.type, "readiness");
      assert.match(exp.summary, /needs review/);
      assert.ok(exp.steps.length >= 3);
    });

    it("marks verified when no issues", () => {
      const exp = explainReadiness({
        state: "ready",
        score: 100,
        issuesCount: 0,
        blockingCount: 0,
        topIssues: [],
      });
      assert.equal(exp.isVerified, true);
    });
  });

  describe("explainFact", () => {
    it("explains an extracted fact with source", () => {
      const exp = explainFact({
        label: "Amount Owed",
        value: "$1,234.56",
        source: "extracted",
        confidence: "high",
        sourceExcerpt: "Amount due: $1,234.56",
        extractionMethod: "Pattern matching on amount keywords",
      });
      assert.equal(exp.type, "fact");
      assert.match(exp.title, /Amount Owed/);
      assert.ok(exp.steps.some((s) => s.label === "Source excerpt"));
      assert.ok(exp.steps.some((s) => s.label === "Extraction method"));
      assert.equal(exp.confidence, "high");
    });
  });
});
