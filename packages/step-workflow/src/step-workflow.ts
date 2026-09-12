/**
 * Generic linear step-matter engine.
 *
 * Unlike a branching phase/gate/capability engine, this is right-sized for a
 * straight-line, N-step matter workflow: Intake -> Documents -> ... -> Mail.
 * Every step-based workflow (in any vertical) defines its steps and reuses
 * this same reducer/service/repository stack; only the
 * StepWorkflowDefinition and each step's UI differ per app.
 */

export type StepStatus = "not_started" | "in_progress" | "complete" | "needs_review";

export type StepDefinition = {
  id: string;
  label: string;
};

export type StepWorkflowDefinition = {
  id: string;
  title: string;
  steps: StepDefinition[];
  /** Step id that requires `state.approved` before it can be completed (e.g. "mail"). */
  requiresApprovalBeforeStep?: string;
};

export type ChecklistItemState = {
  id: string;
  label: string;
  done: boolean;
};

export type StepState = {
  status: StepStatus;
  checklist: ChecklistItemState[];
  data: Record<string, unknown>;
  completedAt: string | null;
};

export type StepMatterState = {
  id: string;
  ownerId: string;
  workflowId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  currentStepId: string;
  steps: Record<string, StepState>;
  approved: boolean;
  approvedAt: string | null;
};

function initialStepState(): StepState {
  return { status: "not_started", checklist: [], data: {}, completedAt: null };
}

export function createStepMatterState(input: {
  id: string;
  ownerId: string;
  definition: StepWorkflowDefinition;
  now?: string;
}): StepMatterState {
  const now = input.now ?? new Date().toISOString();
  const steps: Record<string, StepState> = {};
  input.definition.steps.forEach((step, index) => {
    steps[step.id] = { ...initialStepState(), status: index === 0 ? "in_progress" : "not_started" };
  });

  const firstStep = input.definition.steps[0];
  if (!firstStep) throw new Error(`Step workflow ${input.definition.id} has no steps`);

  return {
    id: input.id,
    ownerId: input.ownerId,
    workflowId: input.definition.id,
    version: 1,
    createdAt: now,
    updatedAt: now,
    currentStepId: firstStep.id,
    steps,
    approved: false,
    approvedAt: null,
  };
}

function requireStep(definition: StepWorkflowDefinition, stepId: string): StepDefinition {
  const step = definition.steps.find((candidate) => candidate.id === stepId);
  if (!step) throw new Error(`Unknown step: ${stepId}`);
  return step;
}

export function updateStepData(
  state: StepMatterState,
  stepId: string,
  patch: Record<string, unknown>,
  now = new Date().toISOString(),
): StepMatterState {
  const current = state.steps[stepId];
  if (!current) throw new Error(`Unknown step: ${stepId}`);

  return {
    ...state,
    version: state.version + 1,
    updatedAt: now,
    steps: {
      ...state.steps,
      [stepId]: {
        ...current,
        data: { ...current.data, ...patch },
        status: current.status === "not_started" ? "in_progress" : current.status,
      },
    },
  };
}

export function setChecklistItem(
  state: StepMatterState,
  stepId: string,
  item: ChecklistItemState,
  now = new Date().toISOString(),
): StepMatterState {
  const current = state.steps[stepId];
  if (!current) throw new Error(`Unknown step: ${stepId}`);
  const existingIndex = current.checklist.findIndex((candidate) => candidate.id === item.id);
  const checklist =
    existingIndex >= 0
      ? current.checklist.map((candidate, index) => (index === existingIndex ? item : candidate))
      : [...current.checklist, item];

  return {
    ...state,
    version: state.version + 1,
    updatedAt: now,
    steps: { ...state.steps, [stepId]: { ...current, checklist } },
  };
}

export function completeStep(
  state: StepMatterState,
  definition: StepWorkflowDefinition,
  stepId: string,
  now = new Date().toISOString(),
): StepMatterState {
  const stepDefinition = requireStep(definition, stepId);
  if (definition.requiresApprovalBeforeStep === stepDefinition.id && !state.approved) {
    throw new Error(`Step ${stepId} requires matter approval before it can be completed.`);
  }

  const current = state.steps[stepId];
  if (!current) throw new Error(`Unknown step: ${stepId}`);
  if (state.currentStepId !== stepId) {
    throw new Error(`Cannot complete ${stepId}; the current step is ${state.currentStepId}.`);
  }

  const index = definition.steps.findIndex((step) => step.id === stepId);
  const nextStep = definition.steps[index + 1];

  const steps: Record<string, StepState> = {
    ...state.steps,
    [stepId]: { ...current, status: "complete" as const, completedAt: now },
  };
  if (nextStep && steps[nextStep.id]?.status === "not_started") {
    steps[nextStep.id] = { ...steps[nextStep.id], status: "in_progress" };
  }

  return {
    ...state,
    version: state.version + 1,
    updatedAt: now,
    currentStepId: nextStep ? nextStep.id : stepId,
    steps,
  };
}

export function approveMatter(state: StepMatterState, now = new Date().toISOString()): StepMatterState {
  if (state.approved) return state;
  return { ...state, version: state.version + 1, updatedAt: now, approved: true, approvedAt: now };
}

export function getStepMatterProgress(
  definition: StepWorkflowDefinition,
  state: StepMatterState,
): { completed: number; total: number } {
  const total = definition.steps.length;
  const completed = definition.steps.filter((step) => state.steps[step.id]?.status === "complete").length;
  return { completed, total };
}

export function assertStepMatterOwner(state: StepMatterState, ownerId: string): void {
  if (state.ownerId !== ownerId) {
    throw new Error("Matter is not accessible for this owner.");
  }
}
