export type CompoundPhaseStatus =
  | "locked"
  | "ready"
  | "in_progress"
  | "blocked"
  | "complete";

export type CompoundGateStatus = "pending" | "passed" | "blocked";

export interface CompoundWorkflowPhaseDefinition {
  id: string;
  title: string;
  capabilities: readonly string[];
  dependsOn: readonly string[];
  gates: readonly string[];
}

export interface CompoundWorkflowDefinition {
  id: string;
  title: string;
  phases: readonly CompoundWorkflowPhaseDefinition[];
}

export interface CompoundGateDecision {
  gate: string;
  status: CompoundGateStatus;
  detail: string | null;
  verifiedBy: "system" | "user" | "professional" | null;
  verifiedAt: string | null;
  supportingRunId: string | null;
}

export type CompoundCapabilityRunStatus = "completed" | "blocked" | "failed";

export interface CompoundCapabilityRun {
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
}

export interface CompoundPhaseState {
  phaseId: string;
  status: CompoundPhaseStatus;
  gates: readonly CompoundGateDecision[];
  startedAt: string | null;
  completedAt: string | null;
}

export interface CompoundMatterState {
  id: string;
  ownerId: string;
  workflowId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  phases: readonly CompoundPhaseState[];
  capabilityRuns: readonly CompoundCapabilityRun[];
}

export type CompoundMatterStatus =
  | "not_started"
  | "active"
  | "blocked"
  | "awaiting_human_review"
  | "complete";

function requirePhase(
  workflow: CompoundWorkflowDefinition,
  phaseId: string,
): CompoundWorkflowPhaseDefinition {
  const phase = workflow.phases.find((candidate) => candidate.id === phaseId);
  if (!phase) throw new Error(`Unknown compound phase: ${phaseId}`);
  return phase;
}

function initialGate(gate: string): CompoundGateDecision {
  return {
    gate,
    status: "pending",
    detail: null,
    verifiedBy: null,
    verifiedAt: null,
    supportingRunId: null,
  };
}

function dependenciesComplete(
  workflow: CompoundWorkflowDefinition,
  phases: readonly CompoundPhaseState[],
  phaseId: string,
): boolean {
  const definition = requirePhase(workflow, phaseId);
  const completed = new Set(
    phases
      .filter((phase) => phase.status === "complete")
      .map((phase) => phase.phaseId),
  );
  return definition.dependsOn.every((dependency) => completed.has(dependency));
}

function normalizePhaseStatuses(
  workflow: CompoundWorkflowDefinition,
  phases: readonly CompoundPhaseState[],
): readonly CompoundPhaseState[] {
  return phases.map((phase) => {
    if (phase.status === "complete") return phase;
    if (!dependenciesComplete(workflow, phases, phase.phaseId)) {
      return { ...phase, status: "locked" as const };
    }
    if (phase.gates.some((gate) => gate.status === "blocked")) {
      return { ...phase, status: "blocked" as const };
    }
    if (phase.status === "in_progress") return phase;
    return { ...phase, status: "ready" as const };
  });
}

/**
 * Generic branching phase/gate runtime recovered from the legacy Private
 * Office compound-workflow engine.
 *
 * Unlike @mailmypdf/step-workflow, this model is intentionally non-linear:
 * phases may depend on multiple prior phases and each phase may carry explicit
 * human/system gates before it can complete.
 */
export function createCompoundMatterState(input: {
  id: string;
  ownerId: string;
  workflow: CompoundWorkflowDefinition;
  now?: string;
}): CompoundMatterState {
  if (!input.id.trim() || !input.ownerId.trim() || !input.workflow.id.trim()) {
    throw new Error("Compound matter identity is incomplete");
  }
  if (input.workflow.phases.length === 0) {
    throw new Error("Compound workflow requires at least one phase");
  }

  const ids = new Set<string>();
  for (const phase of input.workflow.phases) {
    if (!phase.id.trim()) throw new Error("Compound workflow phase id is required");
    if (ids.has(phase.id)) throw new Error(`Duplicate compound phase: ${phase.id}`);
    ids.add(phase.id);
  }
  for (const phase of input.workflow.phases) {
    for (const dependency of phase.dependsOn) {
      if (!ids.has(dependency)) {
        throw new Error(`Phase ${phase.id} depends on unknown phase ${dependency}`);
      }
      if (dependency === phase.id) {
        throw new Error(`Phase ${phase.id} cannot depend on itself`);
      }
    }
  }

  const now = input.now ?? new Date().toISOString();
  const phases = input.workflow.phases.map<CompoundPhaseState>((phase) => ({
    phaseId: phase.id,
    status: phase.dependsOn.length === 0 ? "ready" : "locked",
    gates: phase.gates.map(initialGate),
    startedAt: null,
    completedAt: null,
  }));

  return {
    id: input.id,
    ownerId: input.ownerId,
    workflowId: input.workflow.id,
    version: 1,
    createdAt: now,
    updatedAt: now,
    phases,
    capabilityRuns: [],
  };
}

export function getCompoundMatterStatus(
  state: CompoundMatterState,
): CompoundMatterStatus {
  if (state.phases.every((phase) => phase.status === "complete")) return "complete";
  if (state.phases.some((phase) => phase.status === "blocked")) return "blocked";

  const active = state.phases.find((phase) => phase.status === "in_progress");
  if (
    active?.gates.some(
      (gate) => gate.gate === "human-review" && gate.status === "pending",
    )
  ) {
    return "awaiting_human_review";
  }

  if (
    state.phases.some(
      (phase) => phase.status === "in_progress" || phase.status === "complete",
    )
  ) {
    return "active";
  }
  return "not_started";
}

export function startCompoundPhase(
  state: CompoundMatterState,
  workflow: CompoundWorkflowDefinition,
  phaseId: string,
  now = new Date().toISOString(),
): CompoundMatterState {
  const current = state.phases.find((phase) => phase.phaseId === phaseId);
  if (!current) throw new Error(`Unknown compound phase: ${phaseId}`);
  if (!dependenciesComplete(workflow, state.phases, phaseId)) {
    throw new Error(`Phase ${phaseId} is locked by incomplete dependencies`);
  }
  if (current.status === "complete") {
    throw new Error(`Phase ${phaseId} is already complete`);
  }
  if (current.status === "blocked") {
    throw new Error(`Phase ${phaseId} has a blocking gate`);
  }

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

  return { ...state, phases, version: state.version + 1, updatedAt: now };
}

export function recordCompoundGateDecision(
  state: CompoundMatterState,
  workflow: CompoundWorkflowDefinition,
  input: {
    phaseId: string;
    gate: string;
    status: Exclude<CompoundGateStatus, "pending">;
    detail?: string | null;
    verifiedBy: Exclude<CompoundGateDecision["verifiedBy"], null>;
    supportingRunId?: string | null;
  },
  now = new Date().toISOString(),
): CompoundMatterState {
  const definition = requirePhase(workflow, input.phaseId);
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
                supportingRunId: input.supportingRunId ?? null,
              }
            : gate,
        ),
      };
    }),
  );

  return { ...state, phases, version: state.version + 1, updatedAt: now };
}

export function completeCompoundPhase(
  state: CompoundMatterState,
  workflow: CompoundWorkflowDefinition,
  phaseId: string,
  now = new Date().toISOString(),
): CompoundMatterState {
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

  return { ...state, phases, version: state.version + 1, updatedAt: now };
}

export function recordCompoundCapabilityRun(
  state: CompoundMatterState,
  workflow: CompoundWorkflowDefinition,
  run: CompoundCapabilityRun,
  now = new Date().toISOString(),
): CompoundMatterState {
  const definition = requirePhase(workflow, run.phaseId);
  const phase = state.phases.find((candidate) => candidate.phaseId === run.phaseId);
  if (!phase) throw new Error(`Unknown compound phase: ${run.phaseId}`);
  if (phase.status !== "in_progress") {
    throw new Error(
      `Capability execution requires phase ${run.phaseId} to be in progress`,
    );
  }
  if (!definition.capabilities.includes(run.capabilityLabel)) {
    throw new Error(
      `Capability ${run.capabilityLabel} is not defined for phase ${run.phaseId}`,
    );
  }

  return {
    ...state,
    capabilityRuns: [...state.capabilityRuns, run],
    version: state.version + 1,
    updatedAt: now,
  };
}

export function getReadyCompoundPhaseIds(
  state: CompoundMatterState,
  workflow: CompoundWorkflowDefinition,
): readonly string[] {
  return normalizePhaseStatuses(workflow, state.phases)
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
