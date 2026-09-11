import {
  completeCompoundPhase,
  createCompoundMatterState,
  getCompoundMatterStatus,
  recordCompoundGateDecision,
  startCompoundPhase,
  type CompoundGateDecision,
  type CompoundGateStatus,
  type CompoundMatterState,
} from "@/domain/compound-workflow-runtime";
import type {
  CompoundMatterRepository,
} from "@/domain/compound-matter-repository";
import type {
  CompoundWorkflowGateType,
  CompoundWorkflowId,
} from "@/domain/compound-workflows";

export class CompoundGateAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompoundGateAuthorizationError";
  }
}

export class CompoundWorkflowService {
  constructor(private readonly repository: CompoundMatterRepository) {}

  create(
    ownerId: string,
    workflowId: CompoundWorkflowId,
    actorId = ownerId,
  ): Promise<CompoundMatterState> {
    return this.repository.create({ ownerId, workflowId, actorId });
  }

  get(ownerId: string, matterId: string): Promise<CompoundMatterState | null> {
    return this.repository.get(ownerId, matterId);
  }

  list(
    ownerId: string,
    workflowId?: CompoundWorkflowId,
  ): Promise<CompoundMatterState[]> {
    return this.repository.list(ownerId, workflowId);
  }

  async startPhase(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    phaseId: string;
    actorId?: string;
  }): Promise<CompoundMatterState> {
    const current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);
    const next = startCompoundPhase(current, input.phaseId);

    return this.repository.commit({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      nextState: next,
      status: getCompoundMatterStatus(next),
      event: {
        eventType: "compound_phase_started",
        actorId: input.actorId ?? input.ownerId,
        metadata: { phaseId: input.phaseId },
      },
    });
  }

  async recordSystemGateDecision(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    phaseId: string;
    gate: CompoundWorkflowGateType;
    status: Exclude<CompoundGateStatus, "pending">;
    detail?: string | null;
  }): Promise<CompoundMatterState> {
    return this.recordGateDecision({
      ...input,
      verifiedBy: "system",
      actorId: "system",
    });
  }

  async recordProfessionalGateDecision(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    phaseId: string;
    gate: CompoundWorkflowGateType;
    status: Exclude<CompoundGateStatus, "pending">;
    detail?: string | null;
    professionalActorId: string;
  }): Promise<CompoundMatterState> {
    return this.recordGateDecision({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      phaseId: input.phaseId,
      gate: input.gate,
      status: input.status,
      detail: input.detail,
      verifiedBy: "professional",
      actorId: input.professionalActorId,
    });
  }

  async recordUserApprovalGate(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    phaseId: string;
    gate: "human-review" | "consequential-action";
    approved: boolean;
    detail?: string | null;
    actorId?: string;
  }): Promise<CompoundMatterState> {
    return this.recordGateDecision({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      phaseId: input.phaseId,
      gate: input.gate,
      status: input.approved ? "passed" : "blocked",
      detail: input.detail,
      verifiedBy: "user",
      actorId: input.actorId ?? input.ownerId,
    });
  }

  async completePhase(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    phaseId: string;
    actorId?: string;
  }): Promise<CompoundMatterState> {
    const current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);
    const next = completeCompoundPhase(current, input.phaseId);

    return this.repository.commit({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      nextState: next,
      status: getCompoundMatterStatus(next),
      event: {
        eventType: "compound_phase_completed",
        actorId: input.actorId ?? input.ownerId,
        metadata: { phaseId: input.phaseId },
      },
    });
  }

  private async recordGateDecision(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    phaseId: string;
    gate: CompoundWorkflowGateType;
    status: Exclude<CompoundGateStatus, "pending">;
    detail?: string | null;
    verifiedBy: Exclude<CompoundGateDecision["verifiedBy"], null>;
    actorId: string;
  }): Promise<CompoundMatterState> {
    if (
      input.verifiedBy === "user" &&
      input.gate !== "human-review" &&
      input.gate !== "consequential-action"
    ) {
      throw new CompoundGateAuthorizationError(
        `Users cannot self-verify the ${input.gate} gate.`,
      );
    }

    const current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);

    const next = recordCompoundGateDecision(current, {
      phaseId: input.phaseId,
      gate: input.gate,
      status: input.status,
      detail: input.detail,
      verifiedBy: input.verifiedBy,
    });

    return this.repository.commit({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      nextState: next,
      status: getCompoundMatterStatus(next),
      event: {
        eventType:
          input.status === "passed"
            ? "compound_gate_passed"
            : "compound_gate_blocked",
        actorId: input.actorId,
        metadata: {
          phaseId: input.phaseId,
          gate: input.gate,
          detail: input.detail ?? null,
          verifiedBy: input.verifiedBy,
        },
      },
    });
  }

  private async requireMatter(
    ownerId: string,
    matterId: string,
  ): Promise<CompoundMatterState> {
    const current = await this.repository.get(ownerId, matterId);
    if (!current) throw new Error("Compound matter is not accessible for this owner.");
    return current;
  }

  private requireVersion(
    current: CompoundMatterState,
    expectedVersion: number,
  ): void {
    if (current.version !== expectedVersion) {
      throw new Error(
        "Compound matter changed since it was loaded; refresh and retry.",
      );
    }
  }
}
