import {
  compoundWorkflows,
  type CompoundWorkflowDefinition,
  type CompoundWorkflowGateType,
  type CompoundWorkflowId,
} from "./compound-workflows";

export type CompoundPhaseStatus =
  | "locked"
  | "ready"
  | "in_progress"
  | "blocked"
  | "complete";

export type CompoundGateStatus = "pending" | "passed" | "blocked";

export type CompoundGateDecision = {
  gate: CompoundWorkflowGateType;
  status: CompoundGateStatus;
  detail: string | null;
  verifiedBy: "system" | "user" | "professional" | null;
  verifiedAt: string | null;
};

export type CompoundCapabilityRunStatus = "completed" | "blocked" | "failed";

export type CompoundCapabilityRun = {
  id: string;
  phaseId: string;
  capabilityLabel: string;
  canonicalCapabilityId: string;
  adapterId: string | null;
  status: CompoundCapabilityRunStatus;
  provider: string;
  provenance: "system_generated" | "externally_sourced" | "ai_inferred";
  output: unknown;
  messages: readonly string[];
  executedAt: string;
};

export type CompoundPhaseState = {
  phaseId: string;
  status: CompoundPhaseStatus;
  gates: readonly CompoundGateDecision[];
  startedAt: string | null;
  completedAt: string | null;
};

export type CompoundMatterState = {
  id: string;
  ownerId: string;
  workflowId: CompoundWorkflowId;
  version: number;
  createdAt: string;
  updatedAt: string;
  phases: readonly CompoundPhaseState[];
  capabilityRuns: readonly CompoundCapabilityRun[];
};

export type CompoundMatterStatus =
  | "not_started"
  | "active"
  | "blocked"
  | "awaiting_human_review"
  | "complete";

function initialGate(gate: CompoundWorkflowGateType): CompoundGateDecision {
  return {
    gate,
    status: "pending",
    detail: null,
    verifiedBy: null,
    verifiedAt: null,
  };
}

function dependenciesComplete(
  workflow: CompoundWorkflowDefinition,
  phases: readonly CompoundPhaseState[],
  phaseId: string,
): boolean {
  const definition = workflow.phases.find((phase) => phase.id === phaseId);
  if (!definition) return false;
  const completed = new Set(
    phases.filter((phase) => phase.status === "complete").map((phase) => phase.phaseId),
  );
  return definition.dependsOn.every((dependency) => completed.has(dependency));
}

function normalizePhaseStatuses(
  workflow: CompoundWorkflowDefinition,
  phases: readonly CompoundPhaseState[],
): readonly CompoundPhaseState[] {
  return phases.map((phase) => {
    if (phase.status === "complete") return phase;

    const dependenciesReady = dependenciesComplete(workflow, phases, phase.phaseId);
    if (!dependenciesReady) {
      return { ...phase, status: "locked" as const };
    }

    const hasBlockedGate = phase.gates.some((gate) => gate.status === "blocked");
    if (hasBlockedGate) {
      return { ...phase, status: "blocked" as const };
    }

    if (phase.status === "in_progress") return phase;
    return { ...phase, status: "ready" as const };
  });
}

export function createCompoundMatterState(input: {
  id: string;
  ownerId: string;
  workflowId: CompoundWorkflowId;
  now?: string;
}): CompoundMatterState {
  const workflow = compoundWorkflows[input.workflowId];
  const now = input.now ?? new Date().toISOString();

  const phases = workflow.phases.map<CompoundPhaseState>((phase, index) => ({
    phaseId: phase.id,
    status: index === 0 ? "ready" : "locked",
    gates: phase.gates.map(initialGate),
    startedAt: null,
    completedAt: null,
  }));

  return {
    id: input.id,
    ownerId: input.ownerId,
    workflowId: input.workflowId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    phases,
    capabilityRuns: [],
  };
}

export function getCompoundMatterStatus(state: CompoundMatterState): CompoundMatterStatus {
  if (state.phases.every((phase) => phase.status === "complete")) return "complete";
  if (state.phases.some((phase) => phase.status === "blocked")) return "blocked";

  const activePhase = state.phases.find((phase) => phase.status === "in_progress");
  if (
    activePhase?.gates.some(
      (gate) => gate.gate === "human-review" && gate.status === "pending",
    )
  ) {
    return "awaiting_human_review";
  }

  if (state.phases.some((phase) => phase.status === "in_progress")) return "active";
  if (state.phases.some((phase) => phase.status === "complete")) return "active";
  return "not_started";
}

export function startCompoundPhase(
  state: CompoundMatterState,
  phaseId: string,
  now = new Date().toISOString(),
): CompoundMatterState {
  const workflow = compoundWorkflows[state.workflowId];
  const current = state.phases.find((phase) => phase.phaseId === phaseId);
  if (!current) throw new Error(`Unknown compound phase: ${phaseId}`);
  if (!dependenciesComplete(workflow, state.phases, phaseId)) {
    throw new Error(`Phase ${phaseId} is locked by incomplete dependencies`);
  }
  if (current.status === "complete") throw new Error(`Phase ${phaseId} is already complete`);
  if (current.status === "blocked") throw new Error(`Phase ${phaseId} has a blocking gate`);

  const phases = normalizePhaseStatuses(
    workflow,
    state.phases.map((phase) =>
      phase.phaseId === phaseId
        ? {
            ...phase,
            status: "in_progress" as const,
            startedAt: phase.startedAt ?? now,
          }
        : phase,
    ),
  );

  return {
    ...state,
    phases,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function recordCompoundGateDecision(
  state: CompoundMatterState,
  input: {
    phaseId: string;
    gate: CompoundWorkflowGateType;
    status: Exclude<CompoundGateStatus, "pending">;
    detail?: string | null;
    verifiedBy: Exclude<CompoundGateDecision["verifiedBy"], null>;
  },
  now = new Date().toISOString(),
): CompoundMatterState {
  const workflow = compoundWorkflows[state.workflowId];
  const definition = workflow.phases.find((phase) => phase.id === input.phaseId);
  if (!definition) throw new Error(`Unknown compound phase: ${input.phaseId}`);
  if (!definition.gates.includes(input.gate)) {
    throw new Error(`Gate ${input.gate} is not defined for phase ${input.phaseId}`);
  }
  if (!dependenciesComplete(workflow, state.phases, input.phaseId)) {
    throw new Error(`Phase ${input.phaseId} is locked by incomplete dependencies`);
  }

  const phases = normalizePhaseStatuses(
    workflow,
    state.phases.map((phase) => {
      if (phase.phaseId !== input.phaseId) return phase;
      return {
        ...phase,
        startedAt: phase.startedAt ?? now,
        status: phase.status === "ready" ? ("in_progress" as const) : phase.status,
        gates: phase.gates.map((gate) =>
          gate.gate === input.gate
            ? {
                ...gate,
                status: input.status,
                detail: input.detail ?? null,
                verifiedBy: input.verifiedBy,
                verifiedAt: now,
              }
            : gate,
        ),
      };
    }),
  );

  return {
    ...state,
    phases,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function completeCompoundPhase(
  state: CompoundMatterState,
  phaseId: string,
  now = new Date().toISOString(),
): CompoundMatterState {
  const workflow = compoundWorkflows[state.workflowId];
  const current = state.phases.find((phase) => phase.phaseId === phaseId);
  if (!current) throw new Error(`Unknown compound phase: ${phaseId}`);
  if (!dependenciesComplete(workflow, state.phases, phaseId)) {
    throw new Error(`Phase ${phaseId} is locked by incomplete dependencies`);
  }

  const unresolved = current.gates.filter((gate) => gate.status !== "passed");
  if (unresolved.length > 0) {
    throw new Error(
      `Phase ${phaseId} cannot complete until gates pass: ${unresolved
        .map((gate) => gate.gate)
        .join(", ")}`,
    );
  }

  const phases = normalizePhaseStatuses(
    workflow,
    state.phases.map((phase) =>
      phase.phaseId === phaseId
        ? {
            ...phase,
            status: "complete" as const,
            startedAt: phase.startedAt ?? now,
            completedAt: now,
          }
        : phase,
    ),
  );

  return {
    ...state,
    phases,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function recordCompoundCapabilityRun(
  state: CompoundMatterState,
  run: CompoundCapabilityRun,
  now = new Date().toISOString(),
): CompoundMatterState {
  const workflow = compoundWorkflows[state.workflowId];
  const definition = workflow.phases.find((phase) => phase.id === run.phaseId);
  if (!definition) throw new Error(`Unknown compound phase: ${run.phaseId}`);

  const phase = state.phases.find((candidate) => candidate.phaseId === run.phaseId);
  if (!phase) throw new Error(`Unknown compound phase: ${run.phaseId}`);
  if (phase.status !== "in_progress") {
    throw new Error(`Capability execution requires phase ${run.phaseId} to be in progress`);
  }
  if (!definition.capabilities.includes(run.capabilityLabel)) {
    throw new Error(
      `Capability ${run.capabilityLabel} is not defined for phase ${run.phaseId}`,
    );
  }

  return {
    ...state,
    capabilityRuns: [...(state.capabilityRuns ?? []), run],
    version: state.version + 1,
    updatedAt: now,
  };
}

export function getReadyCompoundPhaseIds(state: CompoundMatterState): readonly string[] {
  const workflow = compoundWorkflows[state.workflowId];
  const normalized = normalizePhaseStatuses(workflow, state.phases);
  return normalized
    .filter((phase) => phase.status === "ready")
    .map((phase) => phase.phaseId);
}

export function assertCompoundMatterOwner(
  state: CompoundMatterState,
  ownerId: string,
): void {
  if (state.ownerId !== ownerId) {
    throw new Error("Compound matter is not accessible for this owner.");
  }
}
