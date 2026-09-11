import type {
  CompoundMatterState,
  CompoundMatterStatus,
} from "./compound-workflow-runtime";
import type { CompoundWorkflowId } from "./compound-workflows";

export type CompoundMatterEventType =
  | "compound_matter_created"
  | "compound_phase_started"
  | "compound_gate_passed"
  | "compound_gate_blocked"
  | "compound_phase_completed";

export type CompoundMatterEventInput = {
  eventType: CompoundMatterEventType;
  actorId: string | null;
  metadata?: Record<string, unknown>;
};

export interface CompoundMatterRepository {
  create(input: {
    ownerId: string;
    workflowId: CompoundWorkflowId;
    actorId: string;
  }): Promise<CompoundMatterState>;

  get(ownerId: string, matterId: string): Promise<CompoundMatterState | null>;

  list(
    ownerId: string,
    workflowId?: CompoundWorkflowId,
  ): Promise<CompoundMatterState[]>;

  commit(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    nextState: CompoundMatterState;
    status: CompoundMatterStatus;
    event: CompoundMatterEventInput;
  }): Promise<CompoundMatterState>;
}

export class CompoundMatterOwnershipError extends Error {
  constructor() {
    super("Compound matter is not accessible for this owner.");
    this.name = "CompoundMatterOwnershipError";
  }
}

export class CompoundMatterVersionConflictError extends Error {
  constructor() {
    super("Compound matter changed since it was loaded; refresh and retry.");
    this.name = "CompoundMatterVersionConflictError";
  }
}
