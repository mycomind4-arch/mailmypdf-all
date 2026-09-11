import type {
  CompoundCapabilityRun,
  CompoundGateDecision,
  CompoundMatterState,
} from "./compound-workflow-runtime";
import { compoundWorkflows, type CompoundWorkflowGateType } from "./compound-workflows";

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

function evidenceReady(run: CompoundCapabilityRun | undefined): CompoundGateReadiness {
  if (!run || run.status !== "completed") {
    return {
      gate: "evidence",
      currentStatus: "pending",
      readiness: "needs_work",
      detail: "Run and review the phase evidence capability before considering this gate.",
      supportingRunId: run?.id ?? null,
    };
  }

  const output = object(run.output);
  const evaluations = Array.isArray(output?.evaluations)
    ? output.evaluations
    : [];
  const unresolved = evaluations.some((entry) => {
    const entryObject = object(entry);
    const evaluation = object(entryObject?.evaluation);
    return evaluation?.hasGaps === true || evaluation?.isContradicted === true;
  });

  return {
    gate: "evidence",
    currentStatus: "pending",
    readiness: unresolved ? "needs_work" : "ready_for_review",
    detail: unresolved
      ? "The evidence evaluation still shows gaps or contradictory evidence."
      : "The evidence capability completed without detected packet gaps or contradictions. Human review is still required before passing the gate.",
    supportingRunId: run.id,
  };
}

function deadlineReady(run: CompoundCapabilityRun | undefined): CompoundGateReadiness {
  if (!run || run.status !== "completed") {
    return {
      gate: "deadline",
      currentStatus: "pending",
      readiness: "needs_work",
      detail: "No completed deadline computation exists for this phase.",
      supportingRunId: run?.id ?? null,
    };
  }

  const output = object(run.output);
  const deadlines = Array.isArray(output?.deadlines) ? output.deadlines : [];
  const authorityVerified = output?.authorityVerified === true;

  return {
    gate: "deadline",
    currentStatus: "pending",
    readiness: deadlines.length > 0 ? "ready_for_review" : "needs_work",
    detail:
      deadlines.length === 0
        ? "The deadline run produced no matching deadline."
        : authorityVerified
          ? "A deadline was computed from a supplied trigger and authority-grounded rule. Review the source and calculation before passing the gate."
          : "A deadline was computed, but its rule authority is not independently verified. Review and ground the rule before relying on it.",
    supportingRunId: run.id,
  };
}

function authorityReady(run: CompoundCapabilityRun | undefined): CompoundGateReadiness {
  if (!run || run.status !== "completed") {
    return {
      gate: "authority",
      currentStatus: "pending",
      readiness: "needs_work",
      detail: run?.status === "blocked"
        ? "Authority research was attempted but did not complete with a live authoritative source."
        : "No completed authority/research run exists for this phase.",
      supportingRunId: run?.id ?? null,
    };
  }

  const output = object(run.output);
  const researchPerformed = output?.researchPerformed === true;
  const citations = Array.isArray(output?.citations) ? output.citations : [];

  return {
    gate: "authority",
    currentStatus: "pending",
    readiness:
      researchPerformed && citations.length > 0
        ? "ready_for_review"
        : "needs_work",
    detail:
      researchPerformed && citations.length > 0
        ? "Live authority research returned citations. Review applicability and jurisdiction before passing the gate."
        : "The run does not establish independently sourced legal authority.",
    supportingRunId: run.id,
  };
}

export function evaluateCompoundPhaseReadiness(
  state: CompoundMatterState,
  phaseId: string,
): readonly CompoundGateReadiness[] {
  const workflow = compoundWorkflows[state.workflowId];
  const phaseDefinition = workflow.phases.find((phase) => phase.id === phaseId);
  const phaseState = state.phases.find((phase) => phase.phaseId === phaseId);
  if (!phaseDefinition || !phaseState) {
    throw new Error(`Unknown compound phase: ${phaseId}`);
  }

  return phaseState.gates.map((decision) => {
    if (decision.status === "passed") {
      return {
        gate: decision.gate,
        currentStatus: decision.status,
        readiness: "ready_for_review" as const,
        detail: decision.detail ?? "Gate has already been explicitly passed.",
        supportingRunId: null,
      };
    }

    if (decision.gate === "evidence") {
      const result = evidenceReady(latestRun(state, phaseId, "evidence"));
      return { ...result, currentStatus: decision.status };
    }

    if (decision.gate === "deadline") {
      const result = deadlineReady(latestRun(state, phaseId, "deadlines"));
      return { ...result, currentStatus: decision.status };
    }

    if (decision.gate === "authority") {
      const result = authorityReady(latestRun(state, phaseId, "research"));
      return { ...result, currentStatus: decision.status };
    }

    if (decision.gate === "counsel-escalation") {
      return {
        gate: decision.gate,
        currentStatus: decision.status,
        readiness: "manual_only" as const,
        detail:
          "Counsel-escalation decisions are never auto-cleared by capability execution. A human must decide whether professional review is required.",
        supportingRunId: null,
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
      };
    }

    return {
      gate: decision.gate,
      currentStatus: decision.status,
      readiness: "manual_only" as const,
      detail: "This gate requires explicit review.",
      supportingRunId: null,
    };
  });
}
