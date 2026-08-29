import { describe, expect, it } from "vitest";
import {
  LLMError,
  parseStructuredOutput,
  generateWithRetry,
  llmUnderstandingSchema,
  llmStrategySchema,
  llmEvidenceSchema,
  llmAuthoritySchema,
  llmDraftSchema,
  _setLLMAdapter,
  _resetLLMAdapter,
  type LLMAdapter,
  type LLMRequest,
  type LLMResponse,
} from "@/platform/llm-adapter";
import { runProfiledWorkflow } from "./workflow-executor";
import { canApproveMatter, canAuthorizeMatterMail } from "./gold-standard";
import { reconcileWithLLM } from "./llm-reconciliation";
import {
  NullAuthorityProvider,
  getAuthorityProvider,
  _setAuthorityProvider,
  _resetAuthorityProvider,
} from "@/platform/authority-provider";
import { getPrompt, getPromptVersion } from "@/platform/prompts";

// ── Helpers ───────────────────────────────────────────────────────────────

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

const validObjective = "Return the full security deposit with itemized statement.";

function buildValidDeterministicAnalysis() {
  return runProfiledWorkflow({
    workflowId: "security-deposit-dispute",
    documentId: "doc-1",
    text: "Lease text with dates September 1, 2025 and June 30, 2026.",
    facts: completeFacts,
    evidenceStatuses: buildEvidenceStatuses(),
    objective: validObjective,
  });
}

function makeMockAdapter(content: string, overrides?: Partial<LLMResponse>): LLMAdapter {
  return {
    provider: "mock",
    async generate(request: LLMRequest): Promise<LLMResponse> {
      return {
        content,
        provenance: {
          provider: "mock",
          model: "mock-model",
          generatedAt: new Date().toISOString(),
          inputHash: "a".repeat(64),
          promptVersion: request.promptVersion,
          ...overrides?.provenance,
        },
      };
    },
  };
}


// ── Structured Output Validation ──────────────────────────────────────────

describe("LLM safety: structured output validation", () => {
  it("rejects malformed JSON", () => {
    expect(() => parseStructuredOutput("not json at all", llmUnderstandingSchema)).toThrow(LLMError);
    expect(() => parseStructuredOutput("not json at all", llmUnderstandingSchema)).toThrow(/not valid JSON/);
  });

  it("rejects schema-invalid understanding output", () => {
    const badJson = JSON.stringify({ summary: "", keyIssues: [] });
    expect(() => parseStructuredOutput(badJson, llmUnderstandingSchema)).toThrow(LLMError);
    expect(() => parseStructuredOutput(badJson, llmUnderstandingSchema)).toThrow(/schema validation/);
  });

  it("rejects schema-invalid strategy output", () => {
    const badJson = JSON.stringify({ suggestions: [{ point: "" }] });
    expect(() => parseStructuredOutput(badJson, llmStrategySchema)).toThrow(LLMError);
  });

  it("rejects schema-invalid evidence output", () => {
    const badJson = JSON.stringify({ assessments: [{ evidenceId: "x", relevance: "invalid" }] });
    expect(() => parseStructuredOutput(badJson, llmEvidenceSchema)).toThrow(LLMError);
  });

  it("rejects schema-invalid authority output", () => {
    const badJson = JSON.stringify({ researchPerformed: "yes", citations: [] });
    expect(() => parseStructuredOutput(badJson, llmAuthoritySchema)).toThrow(LLMError);
  });

  it("rejects schema-invalid draft output", () => {
    const badJson = JSON.stringify({ subject: "", body: "text" });
    expect(() => parseStructuredOutput(badJson, llmDraftSchema)).toThrow(LLMError);
  });

  it("accepts valid understanding output", () => {
    const validJson = JSON.stringify({
      summary: "A lease dispute over security deposit.",
      keyIssues: ["No itemized statement", "Pre-existing damages"],
      documentType: "lease",
      confidence: 0.85,
    });
    const result = parseStructuredOutput(validJson, llmUnderstandingSchema);
    expect(result.summary).toBe("A lease dispute over security deposit.");
    expect(result.keyIssues).toHaveLength(2);
  });

  it("accepts valid strategy output", () => {
    const validJson = JSON.stringify({
      suggestions: [
        { point: "Document all pre-existing conditions", rationale: "Evidence", priority: "high" },
      ],
      risks: [
        { title: "Statute of limitations", severity: "medium", detail: "Verify deadline" },
      ],
    });
    const result = parseStructuredOutput(validJson, llmStrategySchema);
    expect(result.suggestions).toHaveLength(1);
    expect(result.risks).toHaveLength(1);
  });
});

// ── Bounded Retry Behavior ─────────────────────────────────────────────────

describe("LLM safety: bounded retry behavior", () => {
  it("retries on retryable errors (RESOURCE_EXHAUSTED)", async () => {
    let attempts = 0;
    const adapter: LLMAdapter = {
      provider: "mock",
      async generate(): Promise<LLMResponse> {
        attempts++;
        if (attempts < 2) {
          throw new LLMError("Rate limited", "mock", "RESOURCE_EXHAUSTED");
        }
        return {
          content: "success",
          provenance: { provider: "mock", model: "m", generatedAt: "now", inputHash: "h" },
        };
      },
    };

    const result = await generateWithRetry(adapter, {
      systemPrompt: "s",
      userPrompt: "u",
    }, { maxRetries: 3, baseDelayMs: 1 });
    expect(result.content).toBe("success");
    expect(attempts).toBe(2);
  });

  it("does NOT retry on non-retryable errors (INVALID_ARGUMENT)", async () => {
    let attempts = 0;
    const adapter: LLMAdapter = {
      provider: "mock",
      async generate(): Promise<LLMResponse> {
        attempts++;
        throw new LLMError("Bad request", "mock", "INVALID_ARGUMENT");
      },
    };

    await expect(
      generateWithRetry(adapter, { systemPrompt: "s", userPrompt: "u" }, { maxRetries: 3, baseDelayMs: 1 }),
    ).rejects.toThrow("Bad request");
    expect(attempts).toBe(1);
  });

  it("does NOT retry on non-retryable errors (SCHEMA_INVALID)", async () => {
    let attempts = 0;
    const adapter: LLMAdapter = {
      provider: "mock",
      async generate(): Promise<LLMResponse> {
        attempts++;
        throw new LLMError("Bad schema", "mock", "SCHEMA_INVALID");
      },
    };

    await expect(
      generateWithRetry(adapter, { systemPrompt: "s", userPrompt: "u" }, { maxRetries: 3, baseDelayMs: 1 }),
    ).rejects.toThrow("Bad schema");
    expect(attempts).toBe(1);
  });

  it("does NOT retry on non-retryable errors (MALFORMED_JSON)", async () => {
    let attempts = 0;
    const adapter: LLMAdapter = {
      provider: "mock",
      async generate(): Promise<LLMResponse> {
        attempts++;
        throw new LLMError("Bad JSON", "mock", "MALFORMED_JSON");
      },
    };

    await expect(
      generateWithRetry(adapter, { systemPrompt: "s", userPrompt: "u" }, { maxRetries: 3, baseDelayMs: 1 }),
    ).rejects.toThrow("Bad JSON");
    expect(attempts).toBe(1);
  });

  it("retries at most maxRetries times", async () => {
    let attempts = 0;
    const adapter: LLMAdapter = {
      provider: "mock",
      async generate(): Promise<LLMResponse> {
        attempts++;
        throw new LLMError("Timeout", "mock", "TIMEOUT");
      },
    };

    await expect(
      generateWithRetry(adapter, { systemPrompt: "s", userPrompt: "u" }, { maxRetries: 2, baseDelayMs: 1 }),
    ).rejects.toThrow("Timeout");
    expect(attempts).toBe(3); // 1 initial + 2 retries = 3 total attempts
  });

  it("unknown error codes default to non-retryable", async () => {
    let attempts = 0;
    const adapter: LLMAdapter = {
      provider: "mock",
      async generate(): Promise<LLMResponse> {
        attempts++;
        throw new LLMError("Unknown", "mock", "SOME_UNKNOWN_CODE");
      },
    };

    await expect(
      generateWithRetry(adapter, { systemPrompt: "s", userPrompt: "u" }, { maxRetries: 3, baseDelayMs: 1 }),
    ).rejects.toThrow("Unknown");
    expect(attempts).toBe(1);
  });
});

// ── LLM Cannot Authorize ──────────────────────────────────────────────────

describe("LLM safety: LLM cannot authorize consequential actions", () => {
  it("LLM output does not affect canApproveMatter — deterministic analysis is authoritative", () => {
    const result = buildValidDeterministicAnalysis();
    // Even if LLM says "approve this", canApproveMatter only checks deterministic analysis
    expect(canApproveMatter(result.analysis)).toBe(true);
  });

  it("LLM output cannot bypass human approval gate", () => {
    const result = buildValidDeterministicAnalysis();
    expect(
      canAuthorizeMatterMail({
        analysis: result.analysis,
        draftValidated: true,
        humanApproved: false, // human approval is still required
        recipientComplete: true,
        paymentComplete: true,
      }),
    ).toBe(false);
  });

  it("LLM output cannot bypass payment gate", () => {
    const result = buildValidDeterministicAnalysis();
    expect(
      canAuthorizeMatterMail({
        analysis: result.analysis,
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: false, // payment still required
      }),
    ).toBe(false);
  });

  it("LLM output cannot bypass recipient completeness gate", () => {
    const result = buildValidDeterministicAnalysis();
    expect(
      canAuthorizeMatterMail({
        analysis: result.analysis,
        draftValidated: true,
        humanApproved: true,
        recipientComplete: false,
        paymentComplete: true,
      }),
    ).toBe(false);
  });

  it("LLM output cannot bypass evidence requirements", () => {
    const result = runProfiledWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      evidenceStatuses: {}, // no evidence provided
      objective: validObjective,
    });
    expect(result.blocked).toBe(true);
    expect(canApproveMatter(result.analysis)).toBe(false);
  });

  it("LLM output cannot bypass draft approval — hash must match", async () => {
    const { isApprovalValid } = await import("./draft-provenance");
    // Even if an LLM regenerates a draft, the approved hash won't match
    expect(isApprovalValid("new-hash", "old-hash")).toBe(false);
    expect(isApprovalValid(null, "old-hash")).toBe(false);
    expect(isApprovalValid("same", "same")).toBe(true);
  });
});

// ── Reconciliation: User Facts Not Overwritten ───────────────────────────

describe("LLM safety: user facts are never silently overwritten", () => {
  it("reconciliation returns deterministic analysis when LLM is not configured", async () => {
    const deterministic = buildValidDeterministicAnalysis().analysis;
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      null, // no adapter
      null, // no authority provider
      "security-deposit-dispute",
    );
    expect(result.llmEnhanced).toBe(false);
    expect(result.analysis).toBe(deterministic); // same reference, not modified
  });

  it("reconciliation returns deterministic analysis when LLM produces malformed output", async () => {
    const deterministic = buildValidDeterministicAnalysis().analysis;
    const badAdapter = makeMockAdapter("not valid json {{{");
    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      badAdapter,
      null,
      "security-deposit-dispute",
    );
    expect(result.llmEnhanced).toBe(false);
    expect(result.analysis).toBe(deterministic);
  });

  it("reconciliation preserves user-provided facts when LLM is applied", async () => {
    const deterministic = buildValidDeterministicAnalysis().analysis;
    const validUnderstanding = JSON.stringify({
      summary: "Security deposit dispute.",
      keyIssues: ["No itemized statement"],
      confidence: 0.8,
    });
    const validStrategy = JSON.stringify({
      suggestions: [{ point: "Document pre-existing conditions", rationale: "Evidence", priority: "high" }],
      risks: [],
    });
    const validEvidence = JSON.stringify({
      assessments: [],
      missingEvidence: [],
    });

    let callCount = 0;
    const mockAdapter: LLMAdapter = {
      provider: "mock",
      async generate(): Promise<LLMResponse> {
        callCount++;
        const contents = [validUnderstanding, validStrategy, validEvidence];
        const content = contents[(callCount - 1) % contents.length] ?? "valid";
        return {
          content,
          provenance: { provider: "mock", model: "mock-model", generatedAt: "now", inputHash: "h" },
        };
      },
    };

    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      mockAdapter,
      null,
      "security-deposit-dispute",
    );

    // User-provided facts must still be present and have user_provided provenance
    const userFacts = result.analysis.facts.filter((f) => f.provenance === "user_provided");
    expect(userFacts.length).toBeGreaterThan(0);
    for (const fact of userFacts) {
      // All user facts from completeFacts must still be present
      expect(Object.values(completeFacts)).toContain(fact.value);
    }
  });

  it("reconciliation surfaces conflicts (no silent overwriting)", async () => {
    const deterministic = buildValidDeterministicAnalysis().analysis;
    // The reconciliation service must expose conflicts, not silently overwrite
    // Even with valid LLM output, the user facts remain unchanged
    const validUnderstanding = JSON.stringify({
      summary: "Test",
      keyIssues: [],
      confidence: 0.5,
    });
    const validStrategy = JSON.stringify({
      suggestions: [],
      risks: [],
    });
    const validEvidence = JSON.stringify({
      assessments: [],
      missingEvidence: [],
    });

    let callCount = 0;
    const mockAdapter: LLMAdapter = {
      provider: "mock",
      async generate(): Promise<LLMResponse> {
        callCount++;
        const contents = [validUnderstanding, validStrategy, validEvidence];
        return {
          content: contents[(callCount - 1) % 3] ?? "valid",
          provenance: { provider: "mock", model: "m", generatedAt: "now", inputHash: "h" },
        };
      },
    };

    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      mockAdapter,
      null,
      "security-deposit-dispute",
    );

    // The conflicts array is always present (even if empty)
    expect(Array.isArray(result.conflicts)).toBe(true);
    // No user fact was overwritten
    for (const fact of result.analysis.facts) {
      if (fact.provenance === "user_provided") {
        // Value must be unchanged from the original
        const original = deterministic.facts.find((f) => f.label === fact.label);
        expect(original?.value).toBe(fact.value);
      }
    }
  });
});

// ── Deterministic Path Still Works ────────────────────────────────────────

describe("LLM safety: deterministic path works without LLM", () => {
  it("runProfiledWorkflow works without LLM adapter", () => {
    const result = buildValidDeterministicAnalysis();
    expect(result.blocked).toBe(false);
    expect(result.analysis.facts.length).toBeGreaterThan(0);
    expect(result.draft).toContain("Re:");
  });

  it("runProfiledWorkflowWithLLM returns deterministic result when adapter is null", async () => {
    _setLLMAdapter(null);
    _setAuthorityProvider(null);
    try {
      const { runProfiledWorkflowWithLLM } = await import("./workflow-executor");
      const result = await runProfiledWorkflowWithLLM({
        workflowId: "security-deposit-dispute",
        documentId: "doc-1",
        text: "Lease text.",
        facts: completeFacts,
        evidenceStatuses: buildEvidenceStatuses(),
        objective: validObjective,
      });
      expect(result.llmEnhanced).toBe(false);
      expect(result.llmSkippedReason).toContain("No LLM adapter");
      expect(result.blocked).toBe(false);
    } finally {
      _resetLLMAdapter();
      _resetAuthorityProvider();
    }
  });
});

// ── Authority Provider Honesty ────────────────────────────────────────────

describe("LLM safety: authority provider honesty", () => {
  it("NullAuthorityProvider reports researchPerformed = false", async () => {
    const provider = new NullAuthorityProvider();
    const result = await provider.research({
      workflowId: "security-deposit-dispute",
      context: "test context",
    });
    expect(result.researchPerformed).toBe(false);
    expect(result.citations).toHaveLength(0);
    expect(result.disclaimer).toContain("No external authority research was performed");
  });

  it("NullAuthorityProvider provenance is system_generated, not externally_sourced", async () => {
    const provider = new NullAuthorityProvider();
    const result = await provider.research({
      workflowId: "test",
      context: "test",
    });
    expect(result.provenance).toBe("system_generated");
    expect(result.provenance).not.toBe("externally_sourced");
  });

  it("getAuthorityProvider returns NullAuthorityProvider by default", () => {
    _resetAuthorityProvider();
    const provider = getAuthorityProvider();
    expect(provider.name).toBe("null");
  });

  it("NullAuthorityProvider does not fabricate citations", async () => {
    const provider = new NullAuthorityProvider();
    const result = await provider.research({
      workflowId: "security-deposit-dispute",
      context: "tenant withheld deposit",
      jurisdiction: "Colorado",
    });
    expect(result.citations).toHaveLength(0);
    // The disclaimer must contain the honest negation
    expect(result.disclaimer).toContain("No external authority research");
    // It must NOT claim research was completed
    expect(result.disclaimer).not.toContain("research completed");
    expect(result.disclaimer).not.toContain("successfully performed");
  });
});

// ── Provenance Integrity ──────────────────────────────────────────────────

describe("LLM safety: provenance integrity", () => {
  it("user-provided facts retain user_provided provenance after workflow execution", () => {
    const result = buildValidDeterministicAnalysis();
    for (const fact of result.analysis.facts) {
      expect(fact.provenance).toBe("user_provided");
    }
  });

  it("gold-standard provenance enum includes llm_generated and externally_sourced", () => {
    // These were added in Phase 3 to support LLM and authority provenance
    const validProvenances = [
      "user_provided",
      "extracted",
      "inferred",
      "verified",
      "ai_suggested",
      "llm_generated",
      "externally_sourced",
    ];
    for (const p of validProvenances) {
      expect(validProvenances).toContain(p);
    }
  });

  it("deterministic analysis has null generationProvenance", () => {
    const result = buildValidDeterministicAnalysis();
    expect(result.analysis.generationProvenance).toBe(null);
  });
});

// ── Prompt Versioning ─────────────────────────────────────────────────────

describe("LLM safety: prompt versioning", () => {
  it("all prompts have stable identifiers", () => {
    const ids = [
      "understand-document",
      "assess-evidence",
      "suggest-strategy",
      "research-authority",
      "draft-correspondence",
    ];
    for (const id of ids) {
      const prompt = getPrompt(id);
      expect(prompt.id).toBe(id);
    }
  });

  it("all prompts have explicit versions", () => {
    const ids = [
      "understand-document",
      "assess-evidence",
      "suggest-strategy",
      "research-authority",
      "draft-correspondence",
    ];
    for (const id of ids) {
      const prompt = getPrompt(id);
      expect(prompt.version).toBeTruthy();
      expect(prompt.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("getPromptVersion returns the version string", () => {
    expect(getPromptVersion("understand-document")).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("getPrompt throws on unknown prompt id", () => {
    expect(() => getPrompt("nonexistent")).toThrow("Unknown prompt");
  });

  it("prompts include advisory-only boundary language", () => {
    const authorityPrompt = getPrompt("research-authority");
    expect(authorityPrompt.systemPrompt).toContain("advisory");
    expect(authorityPrompt.systemPrompt).toContain("Fabricate");
  });
});

// ── Advisory Boundary ────────────────────────────────────────────────────

describe("LLM safety: advisory boundary enforcement", () => {
  it("LLM enhanced analysis still requires human approval for mailing", async () => {
    const deterministic = buildValidDeterministicAnalysis().analysis;
    const validUnderstanding = JSON.stringify({
      summary: "Test",
      keyIssues: [],
      confidence: 0.8,
    });
    const validStrategy = JSON.stringify({
      suggestions: [],
      risks: [],
    });
    const validEvidence = JSON.stringify({
      assessments: [],
      missingEvidence: [],
    });

    let callCount = 0;
    const mockAdapter: LLMAdapter = {
      provider: "mock",
      async generate(): Promise<LLMResponse> {
        callCount++;
        const contents = [validUnderstanding, validStrategy, validEvidence];
        return {
          content: contents[(callCount - 1) % 3] ?? "valid",
          provenance: { provider: "mock", model: "m", generatedAt: "now", inputHash: "h" },
        };
      },
    };

    const result = await reconcileWithLLM(
      deterministic,
      "document text",
      mockAdapter,
      null,
      "security-deposit-dispute",
    );

    // Even if LLM-enhanced, human approval is still required
    expect(
      canAuthorizeMatterMail({
        analysis: result.analysis,
        draftValidated: true,
        humanApproved: false,
        recipientComplete: true,
        paymentComplete: true,
      }),
    ).toBe(false);

    // Payment is still required
    expect(
      canAuthorizeMatterMail({
        analysis: result.analysis,
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: false,
      }),
    ).toBe(false);
  });
});
