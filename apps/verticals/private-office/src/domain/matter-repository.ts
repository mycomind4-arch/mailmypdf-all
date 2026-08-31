import type {
  PrivateOfficeMatter,
  MatterStatus,
} from "./matter";
import type { WorkflowId } from "./workflows";

export interface CreateMatterInput {
  ownerId: string;
  workflowId: WorkflowId;
  documentId: string;
  title: string;
}

export interface MatterRepository {
  create(input: CreateMatterInput): Promise<PrivateOfficeMatter>;
  get(ownerId: string, matterId: string): Promise<PrivateOfficeMatter | null>;
  list(ownerId: string, workflowId?: WorkflowId): Promise<PrivateOfficeMatter[]>;
  update(
    ownerId: string,
    matterId: string,
    expectedVersion: number,
    patch: Partial<PrivateOfficeMatter>,
  ): Promise<PrivateOfficeMatter>;
  transition(
    ownerId: string,
    matterId: string,
    expectedVersion: number,
    next: MatterStatus,
    fields?: Partial<
      Pick<
        PrivateOfficeMatter,
        | "providerOrderId"
        | "trackingNumber"
        | "proofHash"
        | "draftHash"
        | "approvedDraftHash"
      >
    >,
  ): Promise<PrivateOfficeMatter>;
}

export class MatterVersionConflictError extends Error {
  constructor() {
    super("Matter changed since it was loaded; refresh and retry.");
    this.name = "MatterVersionConflictError";
  }
}

export class MatterOwnershipError extends Error {
  constructor() {
    super("Matter is not accessible for this owner.");
    this.name = "MatterOwnershipError";
  }
}
