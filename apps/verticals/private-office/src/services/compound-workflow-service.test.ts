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

  it("refuses authority confirmation without an externally sourced citation run", async () => {
    const repository = new MemoryRepository();
    const service = new CompoundWorkflowService(repository);
    let state = await service.create(
      "owner-1",
      "government-accountability-investigation",
    );
    state = await service.startPhase({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
    });

    await expect(
      service.confirmAuthorityGate({
        ownerId: "owner-1",
        matterId: state.id,
        expectedVersion: state.version,
        phaseId: "agency-authority",
      }),
    ).rejects.toThrow(/externally sourced authority run/i);
  });

  it("allows explicit source review to confirm an authority gate without calling it legal applicability", async () => {
    const repository = new MemoryRepository();
    const service = new CompoundWorkflowService(repository);
    let state = await service.create(
      "owner-1",
      "government-accountability-investigation",
    );
    state = await service.startPhase({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
    });

    state = {
      ...state,
      version: state.version + 1,
      capabilityRuns: [
        ...state.capabilityRuns,
        {
          id: "authority-run-1",
          phaseId: "agency-authority",
          capabilityLabel: "authority audit",
          canonicalCapabilityId: "research",
          adapterId: "government",
          status: "completed",
          provider: "authority:official-source",
          provenance: "externally_sourced",
          output: {
            researchPerformed: true,
            citations: [
              {
                title: "Official rule",
                reference: "https://agency.ca.gov/rule",
                summary: "Official source text",
              },
            ],
          },
          messages: [],
          executedAt: "2026-09-11T04:00:00.000Z",
        },
      ],
    };
    repository.state = state;

    state = await service.confirmAuthorityGate({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
      actorId: "owner-1",
    });

    const gate = state.phases
      .find((phase) => phase.phaseId === "agency-authority")
      ?.gates.find((candidate) => candidate.gate === "authority");
    expect(gate?.status).toBe("passed");
    expect(gate?.verifiedBy).toBe("user");
    expect(gate?.supportingRunId).toBe("authority-run-1");
    expect(gate?.detail).toMatch(/source selection only/i);
    expect(gate?.detail).toMatch(/does not establish legal applicability/i);
  });

  it("grounds a deadline only to a citation from the authority run the user confirmed", async () => {
    const repository = new MemoryRepository();
    const service = new CompoundWorkflowService(repository);
    let state = await service.create(
      "owner-1",
      "government-accountability-investigation",
    );
    state = await service.startPhase({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
    });

    state = {
      ...state,
      version: state.version + 1,
      capabilityRuns: [
        ...state.capabilityRuns,
        {
          id: "authority-run-grounding",
          phaseId: "agency-authority",
          capabilityLabel: "authority audit",
          canonicalCapabilityId: "research",
          adapterId: "government",
          status: "completed",
          provider: "authority:official-source",
          provenance: "externally_sourced",
          output: {
            researchPerformed: true,
            citations: [
              {
                title: "Official response rule",
                reference: "https://agency.ca.gov/response-rule",
                url: "https://agency.ca.gov/response-rule",
                summary: "Response is due 30 days after notice.",
                contentHash: "b".repeat(64),
              },
            ],
          },
          messages: [],
          executedAt: "2026-09-11T04:00:00.000Z",
        },
      ],
    };
    repository.state = state;

    state = await service.confirmAuthorityGate({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
      actorId: "owner-1",
    });

    state = await service.executeCapability({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
      capabilityLabel: "deadline ledger",
      actorId: "owner-1",
      execution: {
        currentDate: "2026-09-10",
        timelineEvents: [
          {
            eventType: "notice_received",
            date: "2026-09-01",
            provenanceLevel: "document_extracted",
          },
        ],
        deadlineRules: [
          {
            name: "response-window",
            description: "30-day response rule",
            triggerEventType: "notice_received",
            days: 30,
            calendarType: "calendar",
            deadlineEventType: "response_due",
            authority: "Official response rule",
            authoritySourceUrl: "https://agency.ca.gov/response-rule",
            provenanceLevel: "user_provided",
          },
        ],
      },
    });

    const run = state.capabilityRuns.at(-1)!;
    const output = run.output as {
      authorityVerified: boolean;
      authorityBindings: Array<{
        sourceRunId: string | null;
        contentHash: string | null;
        verified: boolean;
      }>;
    };
    expect(output.authorityVerified).toBe(true);
    expect(output.authorityBindings[0]).toMatchObject({
      sourceRunId: "authority-run-grounding",
      contentHash: "b".repeat(64),
      verified: true,
    });
  });

  it("does not ground a deadline to a URL that was not in the confirmed authority run", async () => {
    const repository = new MemoryRepository();
    const service = new CompoundWorkflowService(repository);
    let state = await service.create(
      "owner-1",
      "government-accountability-investigation",
    );
    state = await service.startPhase({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
    });

    state = {
      ...state,
      version: state.version + 1,
      capabilityRuns: [
        ...state.capabilityRuns,
        {
          id: "authority-run-other",
          phaseId: "agency-authority",
          capabilityLabel: "authority audit",
          canonicalCapabilityId: "research",
          adapterId: "government",
          status: "completed",
          provider: "authority:official-source",
          provenance: "externally_sourced",
          output: {
            researchPerformed: true,
            citations: [
              {
                title: "Official rule",
                url: "https://agency.ca.gov/real-rule",
                reference: "https://agency.ca.gov/real-rule",
                summary: "Official rule",
                contentHash: "c".repeat(64),
              },
            ],
          },
          messages: [],
          executedAt: "2026-09-11T04:00:00.000Z",
        },
      ],
    };
    repository.state = state;
    state = await service.confirmAuthorityGate({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
    });

    state = await service.executeCapability({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
      capabilityLabel: "deadline ledger",
      execution: {
        timelineEvents: [
          {
            eventType: "notice_received",
            date: "2026-09-01",
            provenanceLevel: "document_extracted",
          },
        ],
        deadlineRules: [
          {
            name: "response-window",
            description: "claimed rule",
            triggerEventType: "notice_received",
            days: 30,
            calendarType: "calendar",
            deadlineEventType: "response_due",
            authority: "Claimed rule",
            authoritySourceUrl: "https://agency.ca.gov/not-reviewed",
            provenanceLevel: "user_provided",
          },
        ],
      },
    });

    const output = state.capabilityRuns.at(-1)!.output as {
      authorityVerified: boolean;
    };
    expect(output.authorityVerified).toBe(false);
  });

  it("requires explicit review before a source-grounded deadline gate can pass", async () => {
    const repository = new MemoryRepository();
    const service = new CompoundWorkflowService(repository);
    let state = await service.create(
      "owner-1",
      "government-accountability-investigation",
    );
    state = await service.startPhase({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
    });

    state = {
      ...state,
      version: state.version + 1,
      capabilityRuns: [
        ...state.capabilityRuns,
        {
          id: "authority-run-deadline-review",
          phaseId: "agency-authority",
          capabilityLabel: "authority audit",
          canonicalCapabilityId: "research",
          adapterId: "government",
          status: "completed",
          provider: "authority:official-source",
          provenance: "externally_sourced",
          output: {
            researchPerformed: true,
            citations: [
              {
                title: "Official rule",
                url: "https://agency.ca.gov/rule",
                reference: "https://agency.ca.gov/rule",
                summary: "Response due in 30 days.",
                contentHash: "e".repeat(64),
              },
            ],
          },
          messages: [],
          executedAt: "2026-09-11T04:00:00.000Z",
        },
      ],
    };
    repository.state = state;
    state = await service.confirmAuthorityGate({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
    });

    state = await service.executeCapability({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
      capabilityLabel: "deadline ledger",
      execution: {
        timelineEvents: [
          {
            eventType: "notice_received",
            date: "2026-09-01",
            provenanceLevel: "document_extracted",
          },
        ],
        deadlineRules: [
          {
            name: "response-window",
            description: "30-day response rule",
            triggerEventType: "notice_received",
            days: 30,
            calendarType: "calendar",
            deadlineEventType: "response_due",
            authority: "Official rule",
            authoritySourceUrl: "https://agency.ca.gov/rule",
            provenanceLevel: "user_provided",
          },
        ],
      },
    });

    const before = state.phases
      .find((phase) => phase.phaseId === "agency-authority")
      ?.gates.find((gate) => gate.gate === "deadline");
    expect(before?.status).toBe("pending");

    state = await service.confirmDeadlineGate({
      ownerId: "owner-1",
      matterId: state.id,
      expectedVersion: state.version,
      phaseId: "agency-authority",
    });

    const after = state.phases
      .find((phase) => phase.phaseId === "agency-authority")
      ?.gates.find((gate) => gate.gate === "deadline");
    expect(after?.status).toBe("passed");
    expect(after?.verifiedBy).toBe("user");
    expect(after?.supportingRunId).toBe(
      state.capabilityRuns.at(-1)?.id,
    );
    expect(after?.detail).toMatch(/does not guarantee legal applicability/i);
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
