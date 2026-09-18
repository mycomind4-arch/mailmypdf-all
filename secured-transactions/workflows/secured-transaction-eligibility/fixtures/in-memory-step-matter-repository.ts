import {
  StepMatterOwnershipError,
  StepMatterVersionConflictError,
  type StepMatterEventInput,
  type StepMatterRepository,
} from "@mailmypdf/step-workflow";
import { createStepMatterState, type StepMatterState, type StepWorkflowDefinition } from "@mailmypdf/step-workflow";

/**
 * A faithful in-memory implementation of the real StepMatterRepository
 * contract -- not a mocked/bypassed ownership check. get() only returns a
 * row whose owner_id matches the caller, exactly mirroring the
 * owner_id=eq.<ownerId> filter SupabaseStepMatterRepository.get() applies
 * server-side; commit() enforces the same ownership and version-advance
 * checks the real implementation performs before ever reaching Postgres.
 * Used only by this workflow's tests, since no such test double exists
 * yet in @mailmypdf/step-workflow itself.
 */
export class InMemoryStepMatterRepository implements StepMatterRepository {
  private readonly rows = new Map<string, StepMatterState>();
  private idCounter = 0;

  async create(input: {
    ownerId: string;
    definition: StepWorkflowDefinition;
    actorId: string;
  }): Promise<StepMatterState> {
    const id = `matter-${++this.idCounter}`;
    const state = createStepMatterState({ id, ownerId: input.ownerId, definition: input.definition });
    this.rows.set(id, state);
    return state;
  }

  async get(ownerId: string, matterId: string): Promise<StepMatterState | null> {
    const row = this.rows.get(matterId);
    if (!row || row.ownerId !== ownerId) return null;
    return row;
  }

  async list(ownerId: string, workflowId?: string): Promise<StepMatterState[]> {
    return [...this.rows.values()].filter(
      (row) => row.ownerId === ownerId && (!workflowId || row.workflowId === workflowId),
    );
  }

  async commit(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    nextState: StepMatterState;
    event: StepMatterEventInput;
  }): Promise<StepMatterState> {
    const row = this.rows.get(input.matterId);
    if (!row || row.ownerId !== input.ownerId) throw new StepMatterOwnershipError();
    if (row.version !== input.expectedVersion) throw new StepMatterVersionConflictError();
    if (input.nextState.ownerId !== input.ownerId) throw new StepMatterOwnershipError();
    if (input.nextState.version !== input.expectedVersion + 1) {
      throw new Error("Step matter state version must advance by exactly one.");
    }
    this.rows.set(input.matterId, input.nextState);
    return input.nextState;
  }
}
