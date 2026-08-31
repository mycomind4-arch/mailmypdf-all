/**
 * LLM Reconciliation Tests
 *
 * Tests:
 *   - Unanimous agreement
 *   - Two-against-one
 *   - Direct contradiction
 *   - User fact versus LLM
 *   - Evidence versus LLM
 *   - Authority versus LLM
 *   - Uncertainty
 *   - Fact protection (user facts never overwritten)
 */

import { describe, expect, it } from "vitest";
import {
  reconcileFacts,
  conflictsToFindings,
  reconcileClaims,
  reconcileTimeline,
  type FactConflict,
} from "./llm-reconciliation";
import type { LLMExtractedFact } from "./llm-schemas";

// ── Fact Protection ──────────────────────────────────────────────────────

describe("reconciliation: fact protection", () => {
  it("never overwrites user-provided facts with LLM facts", () => {
    const userFacts = [{ label: "contractDate", value: "March 15, 2026" }];
    const llmFacts: LLMExtractedFact[] = [
      {
        label: "contractDate",
        value: "March 12, 2026",
        confidence: 0.9,
        provenance: "llm_generated",
      },
    ];

    const result = reconcileFacts(userFacts, llmFacts, "gemini", "gemini-2.0-flash");

    // User fact is NOT overwritten
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].userValue).toBe("March 15, 2026");
    expect(result.conflicts[0].llmValue).toBe("March 12, 2026");
    expect(result.conflicts[0].status).toBe("requires_verification");
    expect(result.newFacts).toHaveLength(0);
    expect(result.confirmedFacts).toHaveLength(0);
  });

  it("confirms facts when LLM agrees with user", () => {
    const userFacts = [{ label: "propertyAddress", value: "123 Main St" }];
    const llmFacts: LLMExtractedFact[] = [
      {
        label: "propertyAddress",
        value: "123 main st",
        confidence: 0.95,
        provenance: "llm_generated",
      },
    ];

    const result = reconcileFacts(userFacts, llmFacts, "gemini", "gemini-2.0-flash");

    expect(result.confirmedFacts).toHaveLength(1);
    expect(result.conflicts).toHaveLength(0);
  });

  it("adds new facts that are not in user-provided set", () => {
    const userFacts = [{ label: "contractorName", value: "ABC Construction" }];
    const llmFacts: LLMExtractedFact[] = [
      {
        label: "licenseNumber",
        value: "LI-12345",
        confidence: 0.8,
        provenance: "llm_generated",
      },
    ];

    const result = reconcileFacts(userFacts, llmFacts, "gemini", "gemini-2.0-flash");

    expect(result.newFacts).toHaveLength(1);
    expect(result.newFacts[0].label).toBe("licenseNumber");
    expect(result.conflicts).toHaveLength(0);
  });

  it("converts conflicts to findings with requires_verification state", () => {
    const conflicts: FactConflict[] = [
      {
        label: "contractDate",
        userValue: "March 15",
        llmValue: "March 12",
        llmProvider: "gemini",
        llmModel: "gemini-2.0-flash",
        status: "requires_verification",
      },
    ];

    const findings = conflictsToFindings(conflicts);

    expect(findings).toHaveLength(1);
    expect(findings[0].state).toBe("requires_verification");
    expect(findings[0].severity).toBe("high");
    expect(findings[0].title).toContain("contractDate");
    expect(findings[0].detail).toContain("March 15");
    expect(findings[0].detail).toContain("March 12");
  });
});

// ── Claim Reconciliation ─────────────────────────────────────────────────

describe("reconciliation: claim consensus", () => {
  it("confirms claims when all providers agree", () => {
    const result = reconcileClaims([
      { provider: "gemini", model: "g", claims: ["The contract was breached"] },
      { provider: "openai", model: "o", claims: ["The contract was breached"] },
    ]);

    expect(result.unanimous).toBe(true);
    expect(result.conflictsDetected).toBe(false);
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].status).toBe("confirmed");
    expect(result.claims[0].agreeingProviders).toEqual(["gemini", "openai"]);
  });

  it("detects conflicts when providers disagree", () => {
    const result = reconcileClaims([
      { provider: "gemini", model: "g", claims: ["The contract date is March 12"] },
      { provider: "openai", model: "o", claims: ["The contract date is March 15"] },
    ]);

    expect(result.unanimous).toBe(false);
    expect(result.conflictsDetected).toBe(true);
    // Both claims exist, each is conflicting since the other provider didn't make the same claim
    expect(result.claims).toHaveLength(2);
  });

  it("marks single-provider claims as conflicting when multiple providers exist", () => {
    // When there are multiple providers and only one makes a claim,
    // the non-participating provider is treated as a conflicting provider
    const result = reconcileClaims([
      { provider: "gemini", model: "g", claims: ["Unique insight from Gemini"] },
      { provider: "openai", model: "o", claims: ["Different insight from OpenAI"] },
    ]);

    expect(result.unanimous).toBe(false);
    expect(result.conflictsDetected).toBe(true);
    // Both claims are "conflicting" because each provider made a different claim
    const conflictingClaims = result.claims.filter(
      (c) => c.status === "conflicting",
    );
    expect(conflictingClaims.length).toBe(2);
  });

  it("marks claims as conflicting when one provider contradicts others", () => {
    const result = reconcileClaims([
      { provider: "gemini", model: "g", claims: ["Damage is extensive"] },
      { provider: "openai", model: "o", claims: ["Damage is extensive"] },
      { provider: "anthropic", model: "c", claims: ["Damage is minor"] },
    ]);

    expect(result.conflictsDetected).toBe(true);
    const conflictingClaims = result.claims.filter(
      (c) => c.status === "conflicting",
    );
    expect(conflictingClaims.length).toBeGreaterThan(0);
  });

  it("handles uncertainty when only one provider responds", () => {
    const result = reconcileClaims([
      { provider: "gemini", model: "g", claims: ["Single provider claim"] },
    ]);

    expect(result.unanimous).toBe(false);
    expect(result.claims[0].status).toBe("provider_specific");
  });
});

// ── Timeline Reconciliation ──────────────────────────────────────────────

describe("reconciliation: timeline", () => {
  it("combines deterministic and LLM timeline events", () => {
    const result = reconcileTimeline([
      {
        source: "deterministic",
        events: [
          { event: "Contract signed", date: "2026-01-15", description: "Date found in document" },
        ],
      },
      {
        source: "llm",
        events: [
          { event: "Work completed", date: "2026-02-01", description: "LLM extracted completion date" },
        ],
      },
    ]);

    expect(result).toHaveLength(2);
    const sources = result.map((r) => r.source);
    expect(sources).toContain("deterministic");
    expect(sources).toContain("llm");
  });

  it("confirms events when multiple sources agree on date", () => {
    const result = reconcileTimeline([
      {
        source: "deterministic",
        events: [{ event: "Contract signed", date: "2026-01-15", description: "Regex match" }],
      },
      {
        source: "llm",
        events: [{ event: "Contract signed", date: "2026-01-15", description: "LLM extraction" }],
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].verificationStatus).toBe("confirmed");
    expect(result[0].sources).toHaveLength(2);
  });

  it("flags conflicting dates for same event", () => {
    const result = reconcileTimeline([
      {
        source: "deterministic",
        events: [{ event: "Contract signed", date: "2026-01-15", description: "Regex match" }],
      },
      {
        source: "llm",
        events: [{ event: "Contract signed", date: "2026-01-20", description: "LLM extraction" }],
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].verificationStatus).toBe("conflicting");
  });

  it("marks single-source events as requires_verification", () => {
    const result = reconcileTimeline([
      {
        source: "deterministic",
        events: [{ event: "Payment received", date: "2026-03-01", description: "Regex match" }],
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].verificationStatus).toBe("requires_verification");
  });
});
