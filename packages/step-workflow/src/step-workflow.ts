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

export type StepCondition =
  | { kind: "step_complete"; stepId: string }
  | { kind: "data_present"; stepId: string; path: string }
  | { kind: "data_equals"; stepId: string; path: string; value: string | number | boolean | null };

export type StepDefinition = {
  id: string;
  label: string;
  condition?: StepCondition;
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

function readPath(value: unknown, path: string): unknown {
  if (!path.trim()) return undefined;
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

export function isStepActive(definition: StepDefinition, state: StepMatterState): boolean {
  const condition = definition.condition;
  if (!condition) return true;
  const source = state.steps[condition.stepId];
  if (!source) return false;
  if (condition.kind === "step_complete") return source.status === "complete";
  const value = readPath(source.data, condition.path);
  if (condition.kind === "data_present") return value !== undefined && value !== null && value !== "";
  return Object.is(value, condition.value);
}

export function getActiveSteps(definition: StepWorkflowDefinition, state: StepMatterState): StepDefinition[] {
  return definition.steps.filter((step) => isStepActive(step, state));
}

export function createStepMatterState(input: {
  id: string;
  ownerId: string;
  definition: StepWorkflowDefinition;
  now?: string;
}): StepMatterState {
  const now = input.now ?? new Date().toISOString();
  const steps: Record<string, StepState> = {};
  input.definition.steps.forEach((step) => {
    steps[step.id] = initialStepState();
  });

  const provisional: StepMatterState = {
    id: input.id,
    ownerId: input.ownerId,
    workflowId: input.definition.id,
    version: 1,
    createdAt: now,
    updatedAt: now,
    currentStepId: "",
    steps,
    approved: false,
    approvedAt: null,
  };
  const firstStep = getActiveSteps(input.definition, provisional)[0];
  if (!firstStep) throw new Error(`Step workflow ${input.definition.id} has no active steps`);
  steps[firstStep.id] = { ...steps[firstStep.id]!, status: "in_progress" };

  return { ...provisional, currentStepId: firstStep.id, steps };
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

  const steps: Record<string, StepState> = {
    ...state.steps,
    [stepId]: { ...current, status: "complete" as const, completedAt: now },
  };
  const completedState: StepMatterState = { ...state, steps };
  const currentIndex = definition.steps.findIndex((step) => step.id === stepId);
  const nextStep = definition.steps
    .slice(currentIndex + 1)
    .find((candidate) => isStepActive(candidate, completedState));
  if (nextStep && steps[nextStep.id]?.status === "not_started") {
    steps[nextStep.id] = { ...steps[nextStep.id]!, status: "in_progress" };
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
  const active = getActiveSteps(definition, state);
  const total = active.length;
  const completed = active.filter((step) => state.steps[step.id]?.status === "complete").length;
  return { completed, total };
}

export function assertStepMatterOwner(state: StepMatterState, ownerId: string): void {
  if (state.ownerId !== ownerId) {
    throw new Error("Matter is not accessible for this owner.");
  }
}
