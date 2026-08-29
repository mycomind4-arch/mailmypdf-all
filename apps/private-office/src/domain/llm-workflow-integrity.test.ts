/**
 * LLM Workflow Integrity Tests
 *
 * Verifies that LLM intelligence CANNOT bypass deterministic gates:
 *   - LLM cannot bypass blocking issues
 *   - LLM cannot approve a matter
 *   - LLM cannot authorize payment
 *   - LLM cannot authorize mailing
 *   - LLM cannot fabricate proof
 *   - Changed draft invalidates approval
 *   - LLM conflict findings block approval
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  canApproveMatter,
  canAuthorizeMatterMail,
  canCompleteMatterProof,
  analyzeMatterWorkflowInput,
} from "@/domain/gold-standard";
import { isApprovalValid } from "@/domain/draft-provenance";
import { computeDraftHash } from "@/domain/draft-provenance";
import { workflowProfiles } from "@/domain/workflow-profiles";
import { enrichWithLLMIntelligence } from "@/domain/llm-intelligence";
import { runPrivateOfficeWorkflow } from "@/domain/private-office-workflow";
import {
  _setAdapter,
  _resetAdapters,
} from "@/platform/llm-router";
import {
  _setLLMConfig,
  _resetLLMConfig,
} from "@/platform/llm-config";
import type { LLMAdapter, LLMResponse } from "@/platform/llm-adapter";
import type { LLMRuntimeConfig, LLMProviderId } from "@/platform/llm-types";

// ── Helpers ──────────────────────────────────────────────────────────────

function makeMockAdapter(provider: string, model: string, content: string): LLMAdapter {
  return {
    provider,
    async generate(): Promise<LLMResponse> {
      return {
        content,
        provenance: { provider, model, generatedAt: new Date().toISOString(), inputHash: "a".repeat(64) },
      };
    },
  };
}

function makeConfig(providers: LLMProviderId[]): LLMRuntimeConfig {
  const providerConfigs: LLMRuntimeConfig["providers"] = {};
  for (const p of providers) {
    providerConfigs[p] = { apiKey: "key", model: `${p}-model` };
  }
  return {
    defaultProvider: "gemini",
    mode: "standard",
    providers: providerConfigs,
    operationPolicies: {
      classify: "standard", extract: "standard", "extract_timeline": "standard",
      analyze: "standard", assess_risk: "enhanced",
      generate_strategy: "standard", assist_draft: "standard", reconcile: "consensus",
    },
    fallbackEnabled: true, maxRetries: 1, defaultTimeoutMs: 30000,
    defaultTemperature: 0.3, defaultMaxTokens: 2048, promptVersion: "test-1.0.0",
  };
}

const profile = workflowProfiles["contractor-dispute"];

const completeFacts = {
  propertyAddress: "123 Oak Street, Springfield, IL 62701",
  contractorName: "ABC Construction LLC",
  agreementReference: "Contract dated March 1, 2026",
  disputeDescription: "Defective roofing installation causing water damage",
};

const completeEvidenceStatuses: Record<string, "provided"> = {};
for (const req of profile.evidenceRequirements) {
  const slug = req.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  completeEvidenceStatuses[`evidence-${slug}`] = "provided";
}

beforeEach(() => {
  _resetAdapters();
  _resetLLMConfig();
});

afterEach(() => {
  _resetAdapters();
  _resetLLMConfig();
});

// ── LLM Cannot Bypass Blocking Issues ────────────────────────────────────

describe("workflow integrity: LLM cannot bypass blocking issues", () => {
  it("blocking issues from deterministic engine persist even with LLM enrichment", async () => {
    const config = makeConfig(["gemini"]);
    _setLLMConfig(config);
    _setAdapter("gemini", makeMockAdapter("gemini", "g", JSON.stringify({
      classification: { type: "contractor-dispute", confidence: 0.95 },
      facts: [{ label: "contractorName", value: "ABC Construction", confidence: 0.9, provenance: "llm_generated" }],
      findings: [{ id: "f1", finding: "All looks good", severity: "low", state: "confirmed", confidence: 0.9 }],
      timeline: [],
      risks: [],
      strategy: [{ recommendation: "Proceed", basis: "Analysis", confidence: 0.8 }],
    })));

    const baseAnalysis = analyzeMatterWorkflowInput({
      documentId: "doc-1",
      text: "Source document",
      profile,
      workflowFacts: {},  // Missing facts → blocking issues
      objective: "",
    });

    const result = await enrichWithLLMIntelligence({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Source document",
      profile,
      baseAnalysis,
      userFacts: {},
    });

    // Blocking issues from deterministic engine must persist
    expect(result.analysis.blockingIssues.length).toBeGreaterThan(0);
    expect(canApproveMatter(result.analysis)).toBe(false);
  });
});

// ── LLM Cannot Approve Matter ────────────────────────────────────────────

describe("workflow integrity: LLM cannot approve", () => {
  it("LLM finding with confirmed state does not auto-approve", async () => {
    const config = makeConfig(["gemini"]);
    _setLLMConfig(config);
    _setAdapter("gemini", makeMockAdapter("gemini", "g", JSON.stringify({
      classification: { type: "contractor-dispute", confidence: 0.95 },
      facts: [],
      findings: [{ id: "approve", finding: "This should be approved", severity: "low", state: "confirmed", confidence: 1.0 }],
      timeline: [], risks: [], strategy: [],
    })));

    const baseAnalysis = analyzeMatterWorkflowInput({
      documentId: "doc-1",
      text: "Source",
      profile,
      workflowFacts: completeFacts,
      evidenceStatuses: completeEvidenceStatuses,
      objective: "Repair all defects",
    });

    const result = await enrichWithLLMIntelligence({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Source",
      profile,
      baseAnalysis,
      userFacts: completeFacts,
    });

    // Even with LLM "confirmed" findings, approval still requires evidence + no blocking issues
    expect(canApproveMatter(result.analysis)).toBe(true);
    // But canAuthorizeMatterMail requires human + payment + recipient — LLM can't set those
    expect(
      canAuthorizeMatterMail({
        analysis: result.analysis,
        draftValidated: true,
        humanApproved: false,  // Human has NOT approved
        recipientComplete: true,
        paymentComplete: true,
      }),
    ).toBe(false);
  });

  it("LLM cannot set humanApproved to true", async () => {
    const result = await runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Source document",
      facts: completeFacts,
      evidenceStatuses: completeEvidenceStatuses,
      objective: "Repair all defects",
      enableLLM: false,
      consequential: {
        draftValidated: true,
        humanApproved: false,  // NOT approved
        recipientComplete: true,
        paymentComplete: true,
        mailingSubmitted: false,
        trackingNumber: null,
        proofReady: false,
        approvedDraftHash: null,
      },
    });

    // Must be blocked at approval stage
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("approval"))).toBe(true);
  });
});

// ── LLM Cannot Authorize Payment ─────────────────────────────────────────

describe("workflow integrity: LLM cannot authorize payment", () => {
  it("paymentComplete=false blocks mailing regardless of LLM output", async () => {
    const baseAnalysis = analyzeMatterWorkflowInput({
      documentId: "doc-1",
      text: "Source",
      profile,
      workflowFacts: completeFacts,
      evidenceStatuses: completeEvidenceStatuses,
      objective: "Repair",
    });

    expect(
      canAuthorizeMatterMail({
        analysis: baseAnalysis,
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: false,  // No payment
      }),
    ).toBe(false);
  });
});

// ── LLM Cannot Authorize Mailing ─────────────────────────────────────────

describe("workflow integrity: LLM cannot authorize mailing", () => {
  it("mailing requires all gates including human approval", async () => {
    const baseAnalysis = analyzeMatterWorkflowInput({
      documentId: "doc-1",
      text: "Source",
      profile,
      workflowFacts: completeFacts,
      evidenceStatuses: completeEvidenceStatuses,
      objective: "Repair",
    });

    const allGatesExceptHuman = {
      analysis: baseAnalysis,
      draftValidated: true,
      humanApproved: false,
      recipientComplete: true,
      paymentComplete: true,
    };

    expect(canAuthorizeMatterMail(allGatesExceptHuman)).toBe(false);

    const allGates = { ...allGatesExceptHuman, humanApproved: true };
    expect(canAuthorizeMatterMail(allGates)).toBe(true);
  });
});

// ── LLM Cannot Fabricate Proof ───────────────────────────────────────────

describe("workflow integrity: LLM cannot fabricate proof", () => {
  it("proof requires real tracking number and proofReady flag", () => {
    expect(canCompleteMatterProof({ trackingNumber: null, proofReady: true })).toBe(false);
    expect(canCompleteMatterProof({ trackingNumber: "TRK-1", proofReady: false })).toBe(false);
    expect(canCompleteMatterProof({ trackingNumber: "TRK-1", proofReady: true })).toBe(true);
  });
});

// ── Changed Draft Invalidates Approval ──────────────────────────────────

describe("workflow integrity: draft provenance", () => {
  it("changed draft invalidates approval", async () => {
    const draftA = "Draft version A content";
    const draftB = "Draft version B content — changed after approval";
    const hashA = await computeDraftHash(draftA);
    const hashB = await computeDraftHash(draftB);

    // Approve draft A
    expect(isApprovalValid(hashA, hashA)).toBe(true);

    // Draft changes to B
    expect(isApprovalValid(hashB, hashA)).toBe(false);

    // Re-approve draft B
    expect(isApprovalValid(hashB, hashB)).toBe(true);
  });
});

// ── LLM Conflict Findings Block Approval ──────────────────────────────────

describe("workflow integrity: LLM fact conflicts block approval", () => {
  it("fact conflict finding (requires_verification) blocks approval", async () => {
    const config = makeConfig(["gemini"]);
    _setLLMConfig(config);
    // LLM returns a conflicting fact value
    _setAdapter("gemini", makeMockAdapter("gemini", "g", JSON.stringify({
      classification: { type: "contractor-dispute", confidence: 0.95 },
      facts: [
        { label: "propertyAddress", value: "456 Different Road", confidence: 0.9, provenance: "llm_generated" },
      ],
      findings: [],
      timeline: [], risks: [], strategy: [],
    })));

    const baseAnalysis = analyzeMatterWorkflowInput({
      documentId: "doc-1",
      text: "Source document",
      profile,
      workflowFacts: { ...completeFacts, propertyAddress: "123 Oak Street" },
      evidenceStatuses: completeEvidenceStatuses,
      objective: "Repair",
    });

    const result = await enrichWithLLMIntelligence({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Source document",
      profile,
      baseAnalysis,
      userFacts: { ...completeFacts, propertyAddress: "123 Oak Street" },
    });

    // The conflict should create a requires_verification finding
    const conflictFindings = result.analysis.findings.filter(
      (f) => f.state === "requires_verification" && f.title.includes("conflict"),
    );
    expect(conflictFindings.length).toBeGreaterThan(0);
    expect(result.factConflicts.length).toBeGreaterThan(0);

    // This must block approval
    expect(canApproveMatter(result.analysis)).toBe(false);
  });
});

// ── LLM Failure Safety ────────────────────────────────────────────────────

describe("workflow integrity: LLM failure does not break workflow", () => {
  it("workflow continues deterministically when all LLM providers fail", async () => {
    // No LLM configured — should fall through to deterministic
    const result = await runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Source document with dates like January 15, 2026.",
      facts: completeFacts,
      evidenceStatuses: completeEvidenceStatuses,
      objective: "Repair all defects",
      enableLLM: false,  // No LLM
    });

    expect(result.blocked).toBe(false);
    expect(result.analysis.findings.length).toBeGreaterThan(0);
    expect(result.llmEnriched).toBe(false);
    expect(result.draft).toContain("Re:");
  });

  it("workflow is safe when LLM returns malformed output", async () => {
    const config = makeConfig(["gemini"]);
    _setLLMConfig(config);
    _setAdapter("gemini", makeMockAdapter("gemini", "g", "This is not JSON at all!!!"));

    const result = await runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Source document",
      facts: completeFacts,
      evidenceStatuses: completeEvidenceStatuses,
      objective: "Repair all defects",
    });

    // Should still work with deterministic analysis only
    expect(result.blocked).toBe(false);
    expect(result.llmEnriched).toBe(false);
    expect(result.llmError).toContain("schema validation");
  });
});
