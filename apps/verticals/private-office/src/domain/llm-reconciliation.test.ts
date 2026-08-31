import { describe, expect, it } from "vitest";
import { reconcileWithLLM } from "./llm-reconciliation";
import { runProfiledWorkflow } from "./workflow-executor";
import { NullAuthorityProvider } from "@/platform/authority-provider";
import type { LLMAdapter, LLMRequest, LLMResponse } from "@/platform/llm-adapter";

function buildEvidenceStatuses(): Record<string, "provided"> {
  return {
    "evidence-lease-or-rental-agreement": "provided",
    "evidence-move-in-inspection-or-condition-report": "provided",
    "evidence-move-out-inspection-or-condition-report": "provided",
    "evidence-photos-of-move-in-and-move-out-condition": "provided",
    "evidence-security-deposit-receipt-or-statement": "provided",
    "evidence-deduction-itemization-or-itemized-statement": "provided",
    "evidence-correspondence-with-landlord-or-property-manager": "provided",
    "evidence-rent-payment-records": "provided",
    "evidence-repair-receipts-or-estimates-when-relevant": "provided",
  };
}

const completeFacts: Record<string, string> = {
  rentalPropertyAddress: "789 Pine Court, Denver, CO 80202",
  landlordOrPropertyManagerName: "Mountain View Properties LLC",
  leaseOrRentalAgreementReference: "Lease dated September 1, 2025",
  depositAmount: "$2,500.00",
  disputeDescription: "Landlord retained deposit for pre-existing damages.",
  landlordResponse: "No itemized statement provided within 30 days.",
};

function buildDeterministicAnalysis() {
  return runProfiledWorkflow({
    workflowId: "security-deposit-dispute",
    documentId: "doc-1",
    text: "Lease dated September 1, 2025. Move-out June 30, 2026.",
    facts: completeFacts,
    evidenceStatuses: buildEvidenceStatuses(),
    objective: "Return the full security deposit.",
  });
}

function makeValidUnderstanding() {
  return JSON.stringify({
    summary: "Security deposit dispute over pre-existing damages.",
    keyIssues: ["No itemized statement within 30 days", "Pre-existing damage claims"],
    documentType: "lease",
    confidence: 0.85,
  });
}

function makeValidStrategy() {
  return JSON.stringify({
    suggestions: [
      { point: "Document all pre-existing conditions", rationale: "Establishes baseline", priority: "high" },
      { point: "Request itemized deduction statement", rationale: "Required by law in many jurisdictions", priority: "high" },
    ],
    risks: [
      { title: "Statute of limitations", severity: "medium", detail: "Verify applicable deadline" },
    ],
  });
}

function makeValidEvidence() {
  return JSON.stringify({
    assessments: [
      { evidenceId: "evidence-lease-or-rental-agreement", relevance: "high", notes: "Core document" },
    ],
    missingEvidence: ["Move-in condition report if not available"],
  });
}

function makeMockAdapter(responses: string[]): LLMAdapter {
  let callCount = 0;
  return {
    provider: "mock",
    async generate(request: LLMRequest): Promise<LLMResponse> {
      const content = responses[callCount] ?? responses[responses.length - 1];
      callCount++;
      return {
        content,
        provenance: {
          provider: "mock",
          model: "mock-model",
          generatedAt: "2026-08-23T00:00:00.000Z",
          inputHash: "a".repeat(64),
          promptVersion: request.promptVersion,
        },
      };
    },
  };
}

describe("LLM reconciliation: no adapter configured", () => {
  it("returns deterministic analysis unchanged", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      null,
      null,
      "security-deposit-dispute",
    );
    expect(result.llmEnhanced).toBe(false);
    expect(result.analysis).toBe(deterministic);
    expect(result.llmSkippedReason).toContain("No LLM adapter");
  });

  it("returns no conflicts", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const result = await reconcileWithLLM(
      deterministic,
      "text",
      null,
      null,
      "test",
    );
    expect(result.conflicts).toEqual([]);
  });
});

describe("LLM reconciliation: malformed LLM output", () => {
  it("returns deterministic analysis when LLM produces invalid JSON", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const badAdapter = makeMockAdapter(["not valid json {{{"]);
    const result = await reconcileWithLLM(
      deterministic,
      "text",
      badAdapter,
      null,
      "security-deposit-dispute",
    );
    expect(result.llmEnhanced).toBe(false);
    expect(result.analysis).toBe(deterministic);
  });

  it("returns deterministic analysis when LLM produces schema-invalid output", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const badAdapter = makeMockAdapter([
      JSON.stringify({ summary: "", keyIssues: [] }), // missing required field value
    ]);
    const result = await reconcileWithLLM(
      deterministic,
      "text",
      badAdapter,
      null,
      "security-deposit-dispute",
    );
    expect(result.llmEnhanced).toBe(false);
    expect(result.analysis).toBe(deterministic);
  });
});

describe("LLM reconciliation: valid LLM output", () => {
  it("enhances analysis with LLM strategy suggestions", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const adapter = makeMockAdapter([
      makeValidUnderstanding(),
      makeValidStrategy(),
      makeValidEvidence(),
    ]);
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      adapter,
      null,
      "security-deposit-dispute",
    );
    expect(result.llmEnhanced).toBe(true);
    expect(result.analysis.strategy.length).toBeGreaterThan(deterministic.strategy.length);
    // LLM suggestions should be marked as AI-assisted
    expect(result.analysis.strategy.some((s) => s.includes("[AI-assisted]"))).toBe(true);
  });

  it("enhances analysis with LLM risks (additive)", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const adapter = makeMockAdapter([
      makeValidUnderstanding(),
      makeValidStrategy(),
      makeValidEvidence(),
    ]);
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      adapter,
      null,
      "security-deposit-dispute",
    );
    expect(result.analysis.risks.length).toBeGreaterThanOrEqual(deterministic.risks.length);
    expect(result.analysis.risks.some((r) => r.title.includes("[AI-assisted]"))).toBe(true);
  });

  it("preserves all user-provided facts unchanged", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const adapter = makeMockAdapter([
      makeValidUnderstanding(),
      makeValidStrategy(),
      makeValidEvidence(),
    ]);
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      adapter,
      null,
      "security-deposit-dispute",
    );
    for (const fact of result.analysis.facts) {
      if (fact.provenance === "user_provided") {
        const original = deterministic.facts.find((f) => f.label === fact.label);
        expect(original?.value).toBe(fact.value);
        expect(original?.provenance).toBe(fact.provenance);
      }
    }
  });

  it("sets generationProvenance when LLM is applied", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const adapter = makeMockAdapter([
      makeValidUnderstanding(),
      makeValidStrategy(),
      makeValidEvidence(),
    ]);
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      adapter,
      null,
      "security-deposit-dispute",
    );
    expect(result.llmEnhanced).toBe(true);
    expect(result.llmProvenance).toBeDefined();
    expect(result.llmProvenance?.provider).toBe("mock");
    expect(result.llmProvenance?.model).toBe("mock-model");
  });
});

describe("LLM reconciliation: authority provider integration", () => {
  it("includes authority result from NullAuthorityProvider", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const adapter = makeMockAdapter([
      makeValidUnderstanding(),
      makeValidStrategy(),
      makeValidEvidence(),
    ]);
    const authority = new NullAuthorityProvider();
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      adapter,
      authority,
      "security-deposit-dispute",
    );
    expect(result.authorityResult).toBeDefined();
    expect(result.authorityResult?.researchPerformed).toBe(false);
    expect(result.authorityResult?.citations).toHaveLength(0);
  });

  it("works without authority provider", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const adapter = makeMockAdapter([
      makeValidUnderstanding(),
      makeValidStrategy(),
      makeValidEvidence(),
    ]);
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      adapter,
      null,
      "security-deposit-dispute",
    );
    expect(result.llmEnhanced).toBe(true);
    expect(result.authorityResult).toBeUndefined();
  });
});

describe("LLM reconciliation: conflict surfacing", () => {
  it("conflicts array is always present", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    const adapter = makeMockAdapter([
      makeValidUnderstanding(),
      makeValidStrategy(),
      makeValidEvidence(),
    ]);
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      adapter,
      null,
      "security-deposit-dispute",
    );
    expect(Array.isArray(result.conflicts)).toBe(true);
  });

  it("user-provided facts are never overwritten even with conflicting LLM data", async () => {
    const deterministic = buildDeterministicAnalysis().analysis;
    // LLM tries to suggest a different deposit amount
    const understandingWithConflict = JSON.stringify({
      summary: "Deposit was $1,500, not $2,500.",
      keyIssues: ["Deposit amount discrepancy"],
      confidence: 0.9,
    });
    const adapter = makeMockAdapter([
      understandingWithConflict,
      makeValidStrategy(),
      makeValidEvidence(),
    ]);
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      adapter,
      null,
      "security-deposit-dispute",
    );

    // User-provided deposit amount must be preserved
    const depositFact = result.analysis.facts.find((f) => f.label === "depositAmount");
    expect(depositFact?.value).toBe("$2,500.00");
    expect(depositFact?.provenance).toBe("user_provided");
  });
});
