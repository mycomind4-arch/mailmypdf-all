import type { DisputeCase, DisputeCaseStatus } from "./case";
import type { WorkflowId } from "./workflows";

export interface CreateDisputeCaseInput {
  ownerId: string;
  workflowId: WorkflowId;
  documentId: string;
}

export interface DisputeCaseRepository {
  create(input: CreateDisputeCaseInput): Promise<DisputeCase>;
  get(ownerId: string, caseId: string): Promise<DisputeCase | null>;
  list(ownerId: string, workflowId?: WorkflowId): Promise<DisputeCase[]>;
  update(ownerId: string, caseId: string, expectedVersion: number, patch: Partial<DisputeCase>): Promise<DisputeCase>;
  transition(ownerId: string, caseId: string, expectedVersion: number, next: DisputeCaseStatus, fields?: Partial<Pick<DisputeCase, "providerOrderId" | "trackingNumber" | "proofHash">>): Promise<DisputeCase>;
}

export class CaseVersionConflictError extends Error {
  constructor() { super("Dispute case changed since it was loaded; refresh and retry."); this.name = "CaseVersionConflictError"; }
}

export class CaseOwnershipError extends Error {
  constructor() { super("Dispute case is not accessible for this owner."); this.name = "CaseOwnershipError"; }
}
