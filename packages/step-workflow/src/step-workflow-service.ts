import {
  approveMatter,
  completeStep,
  setChecklistItem,
  updateStepData,
  type ChecklistItemState,
  type StepMatterState,
  type StepWorkflowDefinition,
} from "./step-workflow";
import type { StepMatterRepository } from "./step-matter-repository";

export class StepWorkflowService {
  constructor(
    private readonly repository: StepMatterRepository,
    private readonly definitions: Record<string, StepWorkflowDefinition>,
  ) {}

  create(ownerId: string, workflowId: string, actorId = ownerId): Promise<StepMatterState> {
    const definition = this.requireDefinition(workflowId);
    return this.repository.create({ ownerId, definition, actorId });
  }

  get(ownerId: string, matterId: string): Promise<StepMatterState | null> {
    return this.repository.get(ownerId, matterId);
  }

  list(ownerId: string, workflowId?: string): Promise<StepMatterState[]> {
    return this.repository.list(ownerId, workflowId);
  }

  async updateStepData(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    stepId: string;
    patch: Record<string, unknown>;
    actorId?: string;
  }): Promise<StepMatterState> {
    const current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);
    const next = updateStepData(current, input.stepId, input.patch);

    return this.repository.commit({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      nextState: next,
      event: {
        eventType: "step_matter_step_updated",
        actorId: input.actorId ?? input.ownerId,
        metadata: { stepId: input.stepId },
      },
    });
  }

  async setChecklistItem(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    stepId: string;
    item: ChecklistItemState;
    actorId?: string;
  }): Promise<StepMatterState> {
    const current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);
    const next = setChecklistItem(current, input.stepId, input.item);

    return this.repository.commit({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      nextState: next,
      event: {
        eventType: "step_matter_checklist_updated",
        actorId: input.actorId ?? input.ownerId,
        metadata: { stepId: input.stepId, itemId: input.item.id, done: input.item.done },
      },
    });
  }

  async completeStep(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    stepId: string;
    actorId?: string;
  }): Promise<StepMatterState> {
    const current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);
    const definition = this.requireDefinition(current.workflowId);
    const next = completeStep(current, definition, input.stepId);

    return this.repository.commit({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      nextState: next,
      event: {
        eventType: "step_matter_step_completed",
        actorId: input.actorId ?? input.ownerId,
        metadata: { stepId: input.stepId },
      },
    });
  }

  async approve(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    actorId?: string;
  }): Promise<StepMatterState> {
    const current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);
    const next = approveMatter(current);

    return this.repository.commit({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      nextState: next,
      event: { eventType: "step_matter_approved", actorId: input.actorId ?? input.ownerId },
    });
  }

  private requireDefinition(workflowId: string): StepWorkflowDefinition {
    const definition = this.definitions[workflowId];
    if (!definition) throw new Error(`Unknown step workflow: ${workflowId}`);
    return definition;
  }

  private async requireMatter(ownerId: string, matterId: string): Promise<StepMatterState> {
    const current = await this.repository.get(ownerId, matterId);
    if (!current) throw new Error("Matter is not accessible for this owner.");
    return current;
  }

  private requireVersion(current: StepMatterState, expectedVersion: number): void {
    if (current.version !== expectedVersion) {
      throw new Error("Matter changed since it was loaded; refresh and retry.");
    }
  }
}
