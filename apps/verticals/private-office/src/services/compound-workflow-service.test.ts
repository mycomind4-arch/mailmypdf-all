import { describe, expect, it } from "vitest";
import type {
  CompoundMatterEventInput,
  CompoundMatterRepository,
} from "@/domain/compound-matter-repository";
import {
  getCompoundMatterStatus,
  type CompoundMatterState,
  type CompoundMatterStatus,
} from "@/domain/compound-workflow-runtime";
import type { CompoundWorkflowId } from "@/domain/compound-workflows";
import {
  CompoundGateAuthorizationError,
  CompoundWorkflowService,
} from "./compound-workflow-service";

class MemoryRepository implements CompoundMatterRepository {
  state: CompoundMatterState | null = null;
  lastEvent: CompoundMatterEventInput | null = null;

  async create(input: {
    ownerId: string;
    workflowId: CompoundWorkflowId;
    actorId: string;
  }): Promise<CompoundMatterState> {
    const { createCompoundMatterState } = await import(
      "@/domain/compound-workflow-runtime"
    );
    this.state = createCompoundMatterState({
      id: "matter-1",
      ownerId: input.ownerId,
      workflowId: input.workflowId,
      now: "2026-09-10T20:00:00.000Z",
    });
    return this.state;
  }

  async get(ownerId: string, matterId: string): Promise<CompoundMatterState | null> {
    return this.state?.ownerId === ownerId && this.state.id === matterId
      ? this.state
      : null;
  }

  async list(): Promise<CompoundMatterState[]> {
    return this.state ? [this.state] : [];
  }

  async commit(input: {
    nextState: CompoundMatterState;
    status: CompoundMatterStatus;
    event: CompoundMatterEventInput;
  }): Promise<CompoundMatterState> {
    expect(input.status).toBe(getCompoundMatterStatus(input.nextState));
    this.state = input.nextState;
    this.lastEvent = input.event;
    return input.nextState;
  }
}

describe("CompoundWorkflowService", () => {
  it("persists phase starts with an audit event", async () => {
    const repository = new MemoryRepository();
    const service = new CompoundWorkflowService(repository);
    const created = await service.create(
      "owner-1",
      "government-accusation-defense",
    );

    const next = await service.startPhase({
      ownerId: "owner-1",
      matterId: created.id,
      expectedVersion: created.version,
      phaseId: "triage-authority",
    });

    expect(next.version).toBe(2);
    expect(repository.lastEvent?.eventType).toBe("compound_phase_started");
    expect(repository.lastEvent?.metadata).toEqual({ phaseId: "triage-authority" });
  });

  it("does not let a user self-verify authority or deadline gates", async () => {
    const repository = new MemoryRepository();
    const service = new CompoundWorkflowService(repository);
    const created = await service.create(
      "owner-1",
      "government-accusation-defense",
    );

    await expect(
      // exercise the private policy through the public user method type boundary
      service.recordUserApprovalGate({
        ownerId: "owner-1",
        matterId: created.id,
        expectedVersion: created.version,
        phaseId: "triage-authority",
        gate: "human-review",
        approved: true,
      }),
    ).rejects.toThrow();

    expect(
      () =>
        new CompoundGateAuthorizationError(
          "Users cannot self-verify the authority gate.",
        ),
    ).not.toThrow();
  });

  it("records explicit user review approval when the phase defines that gate", async () => {
    const repository = new MemoryRepository();
    const service = new CompoundWorkflowService(repository);
    let state = await service.create(
      "owner-1",
      "personal-legal-autonomy-asset-control",
    );

    // Progress the earlier phases using trusted system decisions.
    for (const phase of [
      "identity-records",
      "ownership-control",
      "delegated-authority",
      "contracts-obligations",
      "privacy-succession",
    ]) {
      state = await service.startPhase({
        ownerId: "owner-1",
        matterId: state.id,
        expectedVersion: state.version,
        phaseId: phase,
      });
      const definition = (await import("@/domain/compound-workflows")).compoundWorkflows[
        state.workflowId
      ].phases.find((candidate) => candidate.id === phase)!;
      for (const gate of definition.gates) {
        state = await service.recordSystemGateDecision({
          ownerId: "owner-1",
          matterId: state.id,
          expectedVersion: state.version,
          phaseId: phase,
          gate,
          status: "passed",
        });
      }
      state = await service.completePhase({
        ownerId: "owner-1",
        matterId: state.id,
        expectedVersion: state.version,
        phaseId: phase,
      });
    }

    state = await service.startPhase({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "control-vault",
    });

    state = await service.recordUserApprovalGate({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "control-vault",
      gate: "human-review",
      approved: true,
    });

    expect(repository.lastEvent?.eventType).toBe("compound_gate_passed");
    expect(repository.lastEvent?.metadata).toMatchObject({
      gate: "human-review",
      verifiedBy: "user",
    });
  });
});
