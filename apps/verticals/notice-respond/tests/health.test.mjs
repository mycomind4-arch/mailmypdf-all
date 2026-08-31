import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  assessCaseHealth,
  HEALTH_STATUS_META,
} from "../src/domain/health.ts";
import { createFact } from "../src/domain/fact.ts";

describe("Case Health", () => {
  it("assesses a healthy case as ready", () => {
    const health = assessCaseHealth({
      facts: [createFact("Agency", "IRS", "extracted", "high", { userConfirmed: true })],
      evidence: [{ id: "e1", label: "W-2" }, { id: "e2", label: "1099" }],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
      findings: [],
      contradictions: [],
      missingInfo: [],
      readinessScore: 90,
      readinessState: "ready",
      hasDraft: true,
      draftWordCount: 200,
    });
    assert.equal(health.status, "ready");
    assert.ok(health.overallScore >= 80);
    assert.ok(health.dimensions.length >= 7);
  });

  it("assesses incomplete case", () => {
    const health = assessCaseHealth({
      facts: [],
      evidence: [],
      deadlines: [{ certainty: "missing" }],
      findings: [],
      contradictions: [],
      missingInfo: [{ status: "missing", impact: "blocking" }],
      readinessScore: 10,
      readinessState: "incomplete",
      hasDraft: false,
      draftWordCount: 0,
    });
    assert.equal(health.status, "high_risk");
    assert.ok(health.overallScore < 50);
  });

  it("marks conflicting when contradictions exist", () => {
    const health = assessCaseHealth({
      facts: [createFact("Date", "2026-01-15", "extracted", "high")],
      evidence: [],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
      findings: [],
      contradictions: [{ status: "unresolved", severity: "high" }],
      missingInfo: [],
      readinessScore: 60,
      readinessState: "needs_review",
      hasDraft: true,
      draftWordCount: 100,
    });
    assert.equal(health.status, "conflicting");
  });

  it("marks high_risk for critical contradictions", () => {
    const health = assessCaseHealth({
      facts: [],
      evidence: [],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
      findings: [],
      contradictions: [{ status: "unresolved", severity: "critical" }],
      missingInfo: [],
      readinessScore: 50,
      readinessState: "needs_review",
      hasDraft: false,
      draftWordCount: 0,
    });
    assert.equal(health.status, "high_risk");
  });

  it("marks needs_review for moderate issues", () => {
    const health = assessCaseHealth({
      facts: [createFact("Agency", "IRS", "extracted", "medium")],
      evidence: [],
      deadlines: [{ date: "2026-09-15", certainty: "calculated" }],
      findings: [],
      contradictions: [],
      missingInfo: [{ status: "missing", impact: "medium" }],
      readinessScore: 55,
      readinessState: "needs_review",
      hasDraft: true,
      draftWordCount: 80,
    });
    assert.ok(health.status === "needs_review" || health.status === "incomplete");
  });

  it("includes all expected dimensions", () => {
    const health = assessCaseHealth({
      facts: [],
      evidence: [],
      deadlines: [],
      findings: [],
      contradictions: [],
      missingInfo: [],
      readinessScore: 0,
      readinessState: "draft",
      hasDraft: false,
      draftWordCount: 0,
    });
    const names = health.dimensions.map((d) => d.name);
    assert.ok(names.includes("document_quality"));
    assert.ok(names.includes("fact_completeness"));
    assert.ok(names.includes("evidence_completeness"));
    assert.ok(names.includes("deadline_certainty"));
    assert.ok(names.includes("contradictions"));
    assert.ok(names.includes("missing_information"));
    assert.ok(names.includes("response_readiness"));
  });

  it("marks all scores as heuristic", () => {
    const health = assessCaseHealth({
      facts: [],
      evidence: [],
      deadlines: [],
      findings: [],
      contradictions: [],
      missingInfo: [],
      readinessScore: 0,
      readinessState: "draft",
      hasDraft: false,
      draftWordCount: 0,
    });
    assert.equal(health.isHeuristic, true);
    for (const dim of health.dimensions) {
      assert.equal(dim.isHeuristic, true);
    }
  });

  it("has metadata for all statuses", () => {
    for (const status of ["ready", "needs_review", "incomplete", "conflicting", "high_risk"]) {
      assert.ok(HEALTH_STATUS_META[status]);
      assert.ok(HEALTH_STATUS_META[status].label);
    }
  });
});
