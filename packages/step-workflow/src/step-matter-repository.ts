import type { StepMatterState, StepWorkflowDefinition } from "./step-workflow";

export type StepMatterEventType =
  | "step_matter_created"
  | "step_matter_step_updated"
  | "step_matter_checklist_updated"
  | "step_matter_step_completed"
  | "step_matter_approved";

export type StepMatterEventInput = {
  eventType: StepMatterEventType;
  actorId: string | null;
  metadata?: Record<string, unknown>;
};

export interface StepMatterRepository {
  create(input: {
    ownerId: string;
    definition: StepWorkflowDefinition;
    actorId: string;
  }): Promise<StepMatterState>;

  get(ownerId: string, matterId: string): Promise<StepMatterState | null>;

  list(ownerId: string, workflowId?: string): Promise<StepMatterState[]>;

  commit(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    nextState: StepMatterState;
    event: StepMatterEventInput;
  }): Promise<StepMatterState>;
}

export class StepMatterOwnershipError extends Error {
  constructor() {
    super("Matter is not accessible for this owner.");
    this.name = "StepMatterOwnershipError";
  }
}

export class StepMatterVersionConflictError extends Error {
  constructor() {
    super("Matter changed since it was loaded; refresh and retry.");
    this.name = "StepMatterVersionConflictError";
  }
}
