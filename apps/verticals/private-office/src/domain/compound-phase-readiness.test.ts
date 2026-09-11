import { describe, expect, it } from "vitest";
import {
  createCompoundMatterState,
  recordCompoundCapabilityRun,
  startCompoundPhase,
} from "./compound-workflow-runtime";
import { evaluateCompoundPhaseReadiness } from "./compound-phase-readiness";

describe("compound phase readiness", () => {
  it("never auto-clears counsel escalation", () => {
    let state = createCompoundMatterState({
      id: "matter-1",
      ownerId: "owner-1",
      workflowId: "government-accusation-defense",
    });
    state = startCompoundPhase(state, "triage-authority");

    const readiness = evaluateCompoundPhaseReadiness(state, "triage-authority");
    const counsel = readiness.find(
      (item) => item.gate === "counsel-escalation",
    );
    expect(counsel?.readiness).toBe("manual_only");
    expect(counsel?.eligibleForSystemPass).toBe(false);
  });

  it("keeps authority gate in needs-work state when research is blocked", () => {
    let state = createCompoundMatterState({
      id: "matter-1",
      ownerId: "owner-1",
      workflowId: "government-accountability-investigation",
    });
    state = startCompoundPhase(state, "agency-authority");
    state = recordCompoundCapabilityRun(state, {
      id: "run-1",
      phaseId: "agency-authority",
      capabilityLabel: "authority audit",
      canonicalCapabilityId: "research",
      adapterId: "government",
      status: "blocked",
      provider: "authority:null",
      provenance: "system_generated",
      output: {
        researchPerformed: false,
        citations: [],
      },
      messages: ["No external authority research was performed."],
      executedAt: new Date().toISOString(),
    });

    const readiness = evaluateCompoundPhaseReadiness(
      state,
      "agency-authority",
    );
    const authority = readiness.find((item) => item.gate === "authority");
    expect(authority?.readiness).toBe("needs_work");
    expect(authority?.eligibleForSystemPass).toBe(false);
  });

  it("marks unverified evidence ready for review but not system-passable", () => {
    let state = createCompoundMatterState({
      id: "matter-1",
      ownerId: "owner-1",
      workflowId: "government-accusation-defense",
    });
    state = startCompoundPhase(state, "triage-authority");

    const target = {
      ...state,
      phases: state.phases.map((phase) =>
        phase.phaseId === "proof-elements"
          ? { ...phase, status: "in_progress" as const }
          : phase.phaseId === "triage-authority"
            ? { ...phase, status: "complete" as const }
            : phase,
      ),
    };

    const withRun = recordCompoundCapabilityRun(target, {
      id: "run-evidence",
      phaseId: "proof-elements",
      capabilityLabel: "evidence matrix",
      canonicalCapabilityId: "evidence",
      adapterId: "court-procedure",
      status: "completed",
      provider: "@mailmypdf/intelligence",
      provenance: "system_generated",
      output: {
        evidence: [{ id: "e-1", verified: false }],
        evaluations: [
          {
            claimId: "claim-1",
            evaluation: { hasGaps: false, isContradicted: false },
          },
        ],
      },
      messages: [],
      executedAt: new Date().toISOString(),
    });

    const readiness = evaluateCompoundPhaseReadiness(
      withRun,
      "proof-elements",
    );
    const evidence = readiness.find((item) => item.gate === "evidence");
    expect(evidence?.readiness).toBe("ready_for_review");
    expect(evidence?.currentStatus).toBe("pending");
    expect(evidence?.eligibleForSystemPass).toBe(false);
  });

  it("makes externally sourced authority ready for user review but never system-passable", () => {
    let state = createCompoundMatterState({
      id: "matter-1",
      ownerId: "owner-1",
      workflowId: "government-accountability-investigation",
    });
    state = startCompoundPhase(state, "agency-authority");
    state = recordCompoundCapabilityRun(state, {
      id: "authority-run",
      phaseId: "agency-authority",
      capabilityLabel: "authority audit",
      canonicalCapabilityId: "research",
      adapterId: "government",
      status: "completed",
      provider: "authority:official-source",
      provenance: "externally_sourced",
      output: {
        researchPerformed: true,
        citations: [
          {
            title: "Official source",
            reference: "https://agency.ca.gov/rule",
            summary: "Official source text",
          },
        ],
      },
      messages: [],
      executedAt: new Date().toISOString(),
    });

    const readiness = evaluateCompoundPhaseReadiness(
      state,
      "agency-authority",
    );
    const authority = readiness.find((item) => item.gate === "authority");
    expect(authority?.readiness).toBe("ready_for_review");
    expect(authority?.eligibleForSystemPass).toBe(false);
  });

  it("allows deterministic passage only when every evidence item is verified", () => {
    let state = createCompoundMatterState({
      id: "matter-1",
      ownerId: "owner-1",
      workflowId: "government-accusation-defense",
    });
    state = startCompoundPhase(state, "triage-authority");

    const target = {
      ...state,
      phases: state.phases.map((phase) =>
        phase.phaseId === "proof-elements"
          ? { ...phase, status: "in_progress" as const }
          : phase.phaseId === "triage-authority"
            ? { ...phase, status: "complete" as const }
            : phase,
      ),
    };

    const withRun = recordCompoundCapabilityRun(target, {
      id: "run-verified-evidence",
      phaseId: "proof-elements",
      capabilityLabel: "evidence matrix",
      canonicalCapabilityId: "evidence",
      adapterId: "court-procedure",
      status: "completed",
      provider: "@mailmypdf/intelligence",
      provenance: "system_generated",
      output: {
        evidence: [{ id: "e-1", verified: true }],
        evaluations: [
          {
            claimId: "claim-1",
            evaluation: { hasGaps: false, isContradicted: false },
          },
        ],
      },
      messages: [],
      executedAt: new Date().toISOString(),
    });

    const readiness = evaluateCompoundPhaseReadiness(
      withRun,
      "proof-elements",
    );
    expect(
      readiness.find((item) => item.gate === "evidence")
        ?.eligibleForSystemPass,
    ).toBe(true);
  });
});
