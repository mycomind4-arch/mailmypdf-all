import {
  completeCompoundPhase,
  createCompoundMatterState,
  getCompoundMatterStatus,
  recordCompoundCapabilityRun,
  recordCompoundGateDecision,
  startCompoundPhase,
  type CompoundGateDecision,
  type CompoundGateStatus,
  type CompoundMatterState,
} from "@/domain/compound-workflow-runtime";
import type {
  CompoundMatterRepository,
} from "@/domain/compound-matter-repository";
import {
  compoundWorkflows,
  type CompoundWorkflowGateType,
  type CompoundWorkflowId,
} from "@/domain/compound-workflows";
import type { CompoundCapabilityExecutionInput } from "./compound-capability-executor";

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
    gate: "human-review" | "consequential-action" | "counsel-escalation";
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
      detail:
        input.gate === "counsel-escalation"
          ? input.detail ??
            "User explicitly acknowledged the professional-review requirement. This does not mean counsel was obtained, declined, or waived."
          : input.detail,
      verifiedBy: "user",
      actorId: input.actorId ?? input.ownerId,
    });
  }

  async confirmAuthorityGate(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    phaseId: string;
    actorId?: string;
  }): Promise<CompoundMatterState> {
    const current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);

    const phase = current.phases.find(
      (candidate) => candidate.phaseId === input.phaseId,
    );
    if (phase?.status !== "in_progress") {
      throw new Error(
        `Authority confirmation requires phase ${input.phaseId} to be in progress`,
      );
    }
    const authorityGate = phase.gates.find((gate) => gate.gate === "authority");
    if (!authorityGate) {
      throw new Error(`Phase ${input.phaseId} has no authority gate`);
    }
    if (authorityGate.status !== "pending") {
      throw new Error(
        `Authority gate for phase ${input.phaseId} is already ${authorityGate.status}`,
      );
    }

    const { evaluateCompoundPhaseReadiness } = await import(
      "@/domain/compound-phase-readiness"
    );
    const readiness = evaluateCompoundPhaseReadiness(
      current,
      input.phaseId,
    ).find((item) => item.gate === "authority");

    if (
      readiness?.readiness !== "ready_for_review" ||
      !readiness.supportingRunId
    ) {
      throw new CompoundGateAuthorizationError(
        "Authority sources cannot be confirmed until an externally sourced authority run with citations is ready for review.",
      );
    }

    const run = current.capabilityRuns.find(
      (candidate) => candidate.id === readiness.supportingRunId,
    );
    const output =
      run && typeof run.output === "object" && run.output !== null
        ? (run.output as {
            researchPerformed?: boolean;
            citations?: unknown[];
          })
        : null;

    if (
      !run ||
      run.status !== "completed" ||
      run.canonicalCapabilityId !== "research" ||
      run.provenance !== "externally_sourced" ||
      output?.researchPerformed !== true ||
      !Array.isArray(output.citations) ||
      output.citations.length === 0
    ) {
      throw new CompoundGateAuthorizationError(
        "Authority confirmation requires a completed externally sourced research run with at least one citation.",
      );
    }

    return this.recordGateDecision({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      phaseId: input.phaseId,
      gate: "authority",
      status: "passed",
      detail:
        `User reviewed and confirmed the retrieved authority sources from run ${run.id}. This confirms source selection only; it does not establish legal applicability or replace professional advice.`,
      verifiedBy: "user",
      actorId: input.actorId ?? input.ownerId,
      supportingRunId: run.id,
      userAuthorityConfirmation: true,
    });
  }

  async confirmDeadlineGate(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    phaseId: string;
    actorId?: string;
  }): Promise<CompoundMatterState> {
    const current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);

    const phase = current.phases.find(
      (candidate) => candidate.phaseId === input.phaseId,
    );
    if (phase?.status !== "in_progress") {
      throw new Error(
        `Deadline confirmation requires phase ${input.phaseId} to be in progress`,
      );
    }
    const deadlineGate = phase.gates.find((gate) => gate.gate === "deadline");
    if (!deadlineGate) {
      throw new Error(`Phase ${input.phaseId} has no deadline gate`);
    }
    if (deadlineGate.status !== "pending") {
      throw new Error(
        `Deadline gate for phase ${input.phaseId} is already ${deadlineGate.status}`,
      );
    }

    const { evaluateCompoundPhaseReadiness } = await import(
      "@/domain/compound-phase-readiness"
    );
    const readiness = evaluateCompoundPhaseReadiness(
      current,
      input.phaseId,
    ).find((item) => item.gate === "deadline");

    if (
      readiness?.readiness !== "ready_for_review" ||
      !readiness.supportingRunId
    ) {
      throw new CompoundGateAuthorizationError(
        "Deadline cannot be confirmed until a source-grounded deadline calculation is ready for review.",
      );
    }

    const run = current.capabilityRuns.find(
      (candidate) => candidate.id === readiness.supportingRunId,
    );
    const output =
      run && typeof run.output === "object" && run.output !== null
        ? (run.output as {
            authorityVerified?: boolean;
            deadlines?: unknown[];
          })
        : null;

    if (
      !run ||
      run.status !== "completed" ||
      run.canonicalCapabilityId !== "deadlines" ||
      output?.authorityVerified !== true ||
      !Array.isArray(output.deadlines) ||
      output.deadlines.length === 0
    ) {
      throw new CompoundGateAuthorizationError(
        "Deadline confirmation requires a completed source-grounded deadline run.",
      );
    }

    return this.recordGateDecision({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      phaseId: input.phaseId,
      gate: "deadline",
      status: "passed",
      detail:
        `User reviewed the grounded deadline rule and computed date from run ${run.id}. This confirms the selected rule/calculation for workflow progression; it does not guarantee legal applicability or replace professional advice.`,
      verifiedBy: "user",
      actorId: input.actorId ?? input.ownerId,
      supportingRunId: run.id,
      userDeadlineConfirmation: true,
    });
  }

  async executeCapability(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    phaseId: string;
    capabilityLabel: string;
    actorId?: string;
    execution: Omit<
      CompoundCapabilityExecutionInput,
      | "workflowId"
      | "matterId"
      | "phaseId"
      | "capabilityLabel"
      | "verifiedByActorId"
    >;
  }): Promise<CompoundMatterState> {
    const current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);

    const phaseDefinition = compoundWorkflows[current.workflowId].phases.find(
      (phase) => phase.id === input.phaseId,
    );
    if (!phaseDefinition) throw new Error(`Unknown compound phase: ${input.phaseId}`);
    if (!phaseDefinition.capabilities.includes(input.capabilityLabel)) {
      throw new Error(
        `Capability ${input.capabilityLabel} is not defined for phase ${input.phaseId}`,
      );
    }

    const phaseState = current.phases.find((phase) => phase.phaseId === input.phaseId);
    if (phaseState?.status !== "in_progress") {
      throw new Error(
        `Capability execution requires phase ${input.phaseId} to be in progress`,
      );
    }

    const execution = this.groundDeadlineRules(
      current,
      input.phaseId,
      input.execution,
    );

    const { executeCompoundCapability } = await import(
      "./compound-capability-executor"
    );
    const run = await executeCompoundCapability({
      workflowId: current.workflowId,
      matterId: current.id,
      phaseId: input.phaseId,
      capabilityLabel: input.capabilityLabel,
      ...execution,
      verifiedByActorId: input.actorId ?? input.ownerId,
    });
    const next = recordCompoundCapabilityRun(current, run);

    return this.repository.commit({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      nextState: next,
      status: getCompoundMatterStatus(next),
      event: {
        eventType:
          run.status === "completed"
            ? "compound_capability_completed"
            : run.status === "blocked"
              ? "compound_capability_blocked"
              : "compound_capability_failed",
        actorId: input.actorId ?? input.ownerId,
        metadata: {
          phaseId: input.phaseId,
          capabilityLabel: input.capabilityLabel,
          canonicalCapabilityId: run.canonicalCapabilityId,
          adapterId: run.adapterId,
          provider: run.provider,
          status: run.status,
          messages: run.messages,
        },
      },
    });
  }

  async advanceSystemVerifiableGates(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    phaseId: string;
  }): Promise<{
    matter: CompoundMatterState;
    passedGates: CompoundWorkflowGateType[];
  }> {
    let current = await this.requireMatter(input.ownerId, input.matterId);
    this.requireVersion(current, input.expectedVersion);

    const phase = current.phases.find(
      (candidate) => candidate.phaseId === input.phaseId,
    );
    if (phase?.status !== "in_progress") {
      throw new Error(
        `System gate evaluation requires phase ${input.phaseId} to be in progress`,
      );
    }

    const { evaluateCompoundPhaseReadiness } = await import(
      "@/domain/compound-phase-readiness"
    );
    const readiness = evaluateCompoundPhaseReadiness(
      current,
      input.phaseId,
    ).filter(
      (item) =>
        item.currentStatus === "pending" &&
        item.eligibleForSystemPass,
    );

    const passedGates: CompoundWorkflowGateType[] = [];
    for (const item of readiness) {
      current = await this.recordGateDecision({
        ownerId: input.ownerId,
        matterId: input.matterId,
        expectedVersion: current.version,
        phaseId: input.phaseId,
        gate: item.gate,
        status: "passed",
        detail: `Deterministic system gate: ${item.detail}`,
        verifiedBy: "system",
        actorId: "system",
      });
      passedGates.push(item.gate);
    }

    return { matter: current, passedGates };
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
    supportingRunId?: string | null;
    userAuthorityConfirmation?: boolean;
    userDeadlineConfirmation?: boolean;
  }): Promise<CompoundMatterState> {
    if (
      input.verifiedBy === "user" &&
      input.gate !== "human-review" &&
      input.gate !== "consequential-action" &&
      input.gate !== "counsel-escalation" &&
      !(input.gate === "authority" && input.userAuthorityConfirmation === true) &&
      !(input.gate === "deadline" && input.userDeadlineConfirmation === true)
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
      supportingRunId: input.supportingRunId,
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
          supportingRunId: input.supportingRunId ?? null,
        },
      },
    });
  }

  private groundDeadlineRules(
    state: CompoundMatterState,
    phaseId: string,
    execution: Omit<
      CompoundCapabilityExecutionInput,
      | "workflowId"
      | "matterId"
      | "phaseId"
      | "capabilityLabel"
      | "verifiedByActorId"
    >,
  ): typeof execution {
    if (!execution.deadlineRules?.length) return execution;

    const phase = state.phases.find((candidate) => candidate.phaseId === phaseId);
    const authorityGate = phase?.gates.find((gate) => gate.gate === "authority");
    const supportingRunId =
      authorityGate?.status === "passed" &&
      authorityGate.verifiedBy === "user" &&
      authorityGate.supportingRunId
        ? authorityGate.supportingRunId
        : null;

    const supportingRun = supportingRunId
      ? state.capabilityRuns.find(
          (run) =>
            run.id === supportingRunId &&
            run.status === "completed" &&
            run.canonicalCapabilityId === "research" &&
            run.provenance === "externally_sourced",
        )
      : undefined;

    const output =
      supportingRun &&
      typeof supportingRun.output === "object" &&
      supportingRun.output !== null
        ? (supportingRun.output as {
            researchPerformed?: boolean;
            citations?: Array<{
              url?: string;
              reference?: string;
              contentHash?: string;
            }>;
          })
        : null;

    const citations =
      output?.researchPerformed === true && Array.isArray(output.citations)
        ? output.citations
        : [];

    return {
      ...execution,
      deadlineRules: execution.deadlineRules.map((rule) => {
        const requestedUrl = rule.authoritySourceUrl?.trim();
        const citation = requestedUrl
          ? citations.find(
              (candidate) =>
                candidate.url === requestedUrl ||
                candidate.reference === requestedUrl,
            )
          : undefined;
        const verified =
          Boolean(supportingRunId) &&
          Boolean(citation?.contentHash) &&
          Boolean(requestedUrl);

        return {
          ...rule,
          authoritySourceVerified: verified,
          authoritySourceRunId: verified ? supportingRunId! : undefined,
          authorityContentHash: verified ? citation!.contentHash : undefined,
          provenanceLevel: verified
            ? ("external_source" as const)
            : rule.provenanceLevel,
        };
      }),
    };
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
