import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  detectContradictions,
  resolveContradiction,
  dismissContradiction,
  contradictionSummary,
} from "../src/domain/contradiction.ts";
import { createFact } from "../src/domain/fact.ts";
import { createEvidence } from "../src/domain/evidence.ts";

describe("Contradiction Engine", () => {
  it("detects date conflicts", () => {
    const fact1 = createFact("Notice Date", "2026-01-15", "extracted", "high");
    const fact2 = createFact("Notice Date", "2026-01-20", "extracted", "high");
    const contradictions = detectContradictions({
      facts: [fact1, fact2],
      evidence: [],
      deadlines: [],
    });
    const dateConflicts = contradictions.filter((c) => c.type === "date_conflict");
    assert.ok(dateConflicts.length > 0);
    assert.match(dateConflicts[0].description, /2026-01-15/);
    assert.match(dateConflicts[0].description, /2026-01-20/);
  });

  it("detects amount conflicts", () => {
    const fact1 = createFact("Amount Owed", "$1,000.00", "extracted", "high");
    const fact2 = createFact("Amount Owed", "$1,500.00", "extracted", "high");
    const contradictions = detectContradictions({
      facts: [fact1, fact2],
      evidence: [],
      deadlines: [],
    });
    const amountConflicts = contradictions.filter((c) => c.type === "amount_conflict");
    assert.ok(amountConflicts.length > 0);
  });

  it("detects conflicting deadlines", () => {
    const contradictions = detectContradictions({
      facts: [],
      evidence: [],
      deadlines: [
        { date: "2026-09-15", certainty: "explicit" },
        { date: "2026-10-01", certainty: "explicit" },
      ],
    });
    const deadlineConflicts = contradictions.filter((c) => c.type === "deadline_conflict");
    assert.ok(deadlineConflicts.length > 0);
    assert.equal(deadlineConflicts[0].severity, "critical");
  });

  it("detects evidence contradicting facts", () => {
    const fact = createFact("Amount Owed", "$1,234.56", "extracted", "high");
    fact.id = "fact-1";
    const evidence = createEvidence("document", "Bank Statement", {
      id: "ev-1",
      relatedFactIds: ["fact-1"],
      relationships: [{ factId: "fact-1", relationship: "contradicts" }],
    });
    const contradictions = detectContradictions({
      facts: [fact],
      evidence: [evidence],
      deadlines: [],
    });
    const evConflicts = contradictions.filter((c) => c.type === "evidence_vs_fact");
    assert.ok(evConflicts.length > 0);
  });

  it("returns no contradictions for consistent data", () => {
    const facts = [createFact("Agency", "IRS", "extracted", "high")];
    const contradictions = detectContradictions({
      facts,
      evidence: [],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
    });
    assert.equal(contradictions.length, 0);
  });

  it("allows resolving contradictions", () => {
    const fact1 = createFact("Notice Date", "2026-01-15", "extracted", "high");
    const fact2 = createFact("Notice Date", "2026-01-20", "extracted", "high");
    const contradictions = detectContradictions({
      facts: [fact1, fact2],
      evidence: [],
      deadlines: [],
    });
    const resolved = resolveContradiction(contradictions[0], "2026-01-15", "user-1");
    assert.equal(resolved.status, "resolved");
    assert.equal(resolved.resolvedValue, "2026-01-15");
    assert.ok(resolved.resolvedAt);
  });

  it("allows dismissing contradictions", () => {
    const fact1 = createFact("Notice Date", "2026-01-15", "extracted", "high");
    const fact2 = createFact("Notice Date", "2026-01-20", "extracted", "high");
    const contradictions = detectContradictions({
      facts: [fact1, fact2],
      evidence: [],
      deadlines: [],
    });
    const dismissed = dismissContradiction(contradictions[0], "user-1");
    assert.equal(dismissed.status, "dismissed");
  });

  it("generates summary statistics", () => {
    const fact1 = createFact("Date", "2026-01-15", "extracted", "high");
    const fact2 = createFact("Date", "2026-01-20", "extracted", "high");
    const contradictions = detectContradictions({
      facts: [fact1, fact2],
      evidence: [],
      deadlines: [],
    });
    const summary = contradictionSummary(contradictions);
    assert.ok(summary.total > 0);
    assert.ok(summary.unresolved > 0);
  });
});
