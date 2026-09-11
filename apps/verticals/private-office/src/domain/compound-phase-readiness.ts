import type {
  CompoundCapabilityRun,
  CompoundGateDecision,
  CompoundMatterState,
} from "./compound-workflow-runtime";
import {
  compoundWorkflows,
  type CompoundWorkflowGateType,
} from "./compound-workflows";

export type CompoundGateReadinessStatus =
  | "ready_for_review"
  | "needs_work"
  | "manual_only";

export type CompoundGateReadiness = {
  gate: CompoundWorkflowGateType;
  currentStatus: CompoundGateDecision["status"];
  readiness: CompoundGateReadinessStatus;
  detail: string;
  supportingRunId: string | null;
  eligibleForSystemPass: boolean;
};

function latestRun(
  state: CompoundMatterState,
  phaseId: string,
  canonicalCapabilityId: string,
): CompoundCapabilityRun | undefined {
  return [...(state.capabilityRuns ?? [])]
    .reverse()
    .find(
      (run) =>
        run.phaseId === phaseId &&
        run.canonicalCapabilityId === canonicalCapabilityId,
    );
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function evidenceReady(
  run: CompoundCapabilityRun | undefined,
): CompoundGateReadiness {
  if (!run || run.status !== "completed") {
    return {
      gate: "evidence",
      currentStatus: "pending",
      readiness: "needs_work",
      detail:
        "Run and review the phase evidence capability before considering this gate.",
      supportingRunId: run?.id ?? null,
      eligibleForSystemPass: false,
    };
  }

  const output = object(run.output);
  const evaluations = Array.isArray(output?.evaluations)
    ? output.evaluations
    : [];
  const evidence = Array.isArray(output?.evidence) ? output.evidence : [];

  const unresolved = evaluations.some((entry) => {
    const entryObject = object(entry);
    const evaluation = object(entryObject?.evaluation);
    return (
      evaluation?.hasGaps === true ||
      evaluation?.isContradicted === true ||
      (typeof evaluation?.contradictingCount === "number" &&
        evaluation.contradictingCount > 0)
    );
  });

  const allEvidenceVerified =
    evidence.length > 0 &&
    evidence.every((entry) => object(entry)?.verified === true);

  return {
    gate: "evidence",
    currentStatus: "pending",
    readiness: unresolved ? "needs_work" : "ready_for_review",
    detail: unresolved
      ? "The evidence evaluation still shows gaps or contradictory evidence."
      : allEvidenceVerified
        ? "The evidence packet has no detected gaps or contradictions and every included item is verified. The deterministic gate evaluator may pass this gate."
        : "The evidence capability completed without detected packet gaps or contradictions, but one or more evidence items are not verified. Review is still required.",
    supportingRunId: run.id,
    eligibleForSystemPass: !unresolved && allEvidenceVerified,
  };
}

function deadlineReady(
  run: CompoundCapabilityRun | undefined,
): CompoundGateReadiness {
  if (!run || run.status !== "completed") {
    return {
      gate: "deadline",
      currentStatus: "pending",
      readiness: "needs_work",
      detail: "No completed deadline computation exists for this phase.",
      supportingRunId: run?.id ?? null,
      eligibleForSystemPass: false,
    };
  }

  const output = object(run.output);
  const deadlines = Array.isArray(output?.deadlines)
    ? output.deadlines
    : [];
  const authorityVerified = output?.authorityVerified === true;
  const eligible = deadlines.length > 0 && authorityVerified;

  return {
    gate: "deadline",
    currentStatus: "pending",
    readiness: deadlines.length > 0 ? "ready_for_review" : "needs_work",
    detail:
      deadlines.length === 0
        ? "The deadline run produced no matching deadline."
        : authorityVerified
          ? "A deadline was computed from a supplied trigger and authority-grounded rule. The deterministic gate evaluator may pass this gate."
          : "A deadline was computed, but its rule authority is not independently verified. Ground the rule before relying on it.",
    supportingRunId: run.id,
    eligibleForSystemPass: eligible,
  };
}

function authorityReady(
  run: CompoundCapabilityRun | undefined,
): CompoundGateReadiness {
  if (!run || run.status !== "completed") {
    return {
      gate: "authority",
      currentStatus: "pending",
      readiness: "needs_work",
      detail:
        run?.status === "blocked"
          ? "Authority research was attempted but did not complete with a live authoritative source."
          : "No completed authority/research run exists for this phase.",
      supportingRunId: run?.id ?? null,
      eligibleForSystemPass: false,
    };
  }

  const output = object(run.output);
  const researchPerformed = output?.researchPerformed === true;
  const citations = Array.isArray(output?.citations)
    ? output.citations
    : [];
  const eligible = researchPerformed && citations.length > 0;

  return {
    gate: "authority",
    currentStatus: "pending",
    readiness: eligible ? "ready_for_review" : "needs_work",
    detail: eligible
      ? "Official source material was retrieved with external provenance. Review the cited source, jurisdiction, effective date, and relevance before confirming this authority gate."
      : "The run does not establish independently sourced legal authority.",
    supportingRunId: run.id,
    eligibleForSystemPass: false,
  };
}

export function evaluateCompoundPhaseReadiness(
  state: CompoundMatterState,
  phaseId: string,
): readonly CompoundGateReadiness[] {
  const workflow = compoundWorkflows[state.workflowId];
  const phaseDefinition = workflow.phases.find(
    (phase) => phase.id === phaseId,
  );
  const phaseState = state.phases.find(
    (phase) => phase.phaseId === phaseId,
  );

  if (!phaseDefinition || !phaseState) {
    throw new Error(`Unknown compound phase: ${phaseId}`);
  }

  return phaseState.gates.map((decision) => {
    if (decision.status === "passed") {
      return {
        gate: decision.gate,
        currentStatus: decision.status,
        readiness: "ready_for_review" as const,
        detail:
          decision.detail ?? "Gate has already been explicitly passed.",
        supportingRunId: decision.supportingRunId ?? null,
        eligibleForSystemPass: false,
      };
    }

    if (decision.gate === "evidence") {
      const result = evidenceReady(
        latestRun(state, phaseId, "evidence"),
      );
      return { ...result, currentStatus: decision.status };
    }

    if (decision.gate === "deadline") {
      const result = deadlineReady(
        latestRun(state, phaseId, "deadlines"),
      );
      return { ...result, currentStatus: decision.status };
    }

    if (decision.gate === "authority") {
      const result = authorityReady(
        latestRun(state, phaseId, "research"),
      );
      return { ...result, currentStatus: decision.status };
    }

    if (decision.gate === "counsel-escalation") {
      return {
        gate: decision.gate,
        currentStatus: decision.status,
        readiness: "manual_only" as const,
        detail:
          "Counsel-escalation decisions are never auto-cleared by capability execution. A human must address professional-review needs.",
        supportingRunId: null,
        eligibleForSystemPass: false,
      };
    }

    if (
      decision.gate === "human-review" ||
      decision.gate === "consequential-action"
    ) {
      return {
        gate: decision.gate,
        currentStatus: decision.status,
        readiness: "manual_only" as const,
        detail:
          "This gate requires explicit human action and cannot be passed automatically.",
        supportingRunId: null,
        eligibleForSystemPass: false,
      };
    }

    return {
      gate: decision.gate,
      currentStatus: decision.status,
      readiness: "manual_only" as const,
      detail: "This gate requires explicit review.",
      supportingRunId: null,
      eligibleForSystemPass: false,
    };
  });
}
