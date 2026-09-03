/**
 * Capability lifecycle integration.
 *
 * Converts an authoritative workflow-completion event into deterministic
 * capability, milestone, and workflow-group state transitions. Callers may
 * persist the returned state and audit events in one transaction boundary.
 */

import type { CapabilityGraph } from "./capability-graph";
import {
  completeCapability,
  type CompletionResult,
  type UserCapabilityState,
} from "./state-engine";
import {
  evaluateWorkflowGroups,
  getAvailableWorkflowGroups,
  type WorkflowGroupDefinition,
  type WorkflowGroupEvaluation,
} from "./workflow-group-engine";
import type { MatterEventRepository } from "./event-repository";

export interface CapabilityTransitionInput {
  matterId: string;
  ownerId: string;
  capabilityId: string;
  actorId?: string | null;
  facts?: Readonly<Record<string, unknown>>;
}

export interface CapabilityTransitionEvent {
  eventType:
    | "capability_completed"
    | "milestone_reached"
    | "workflow_group_unlocked";
  matterId: string;
  ownerId: string;
  actorId: string | null;
  metadata: Record<string, unknown>;
}

export interface CapabilityTransitionResult {
  state: UserCapabilityState;
  completion: CompletionResult;
  groupsBefore: WorkflowGroupEvaluation[];
  groupsAfter: WorkflowGroupEvaluation[];
  newlyUnlockedGroups: WorkflowGroupDefinition[];
  events: CapabilityTransitionEvent[];
}

export class CapabilityTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapabilityTransitionError";
  }
}

/**
 * Apply one authoritative capability completion and derive all downstream
 * state. This function is pure: persistence is deliberately left to the
 * caller/repository layer.
 */
export function applyCapabilityCompletion(
  graph: CapabilityGraph,
  groups: readonly WorkflowGroupDefinition[],
  state: UserCapabilityState,
  input: CapabilityTransitionInput,
): CapabilityTransitionResult {
  const capability = graph.capabilities[input.capabilityId];
  if (!capability) {
    throw new CapabilityTransitionError(`Unknown capability: ${input.capabilityId}`);
  }

  const facts = input.facts ?? {};
  const groupsBefore = evaluateWorkflowGroups(graph, groups, state, facts);
  const isReplay = state.completed.includes(input.capabilityId);

  if (!isReplay) {
    const missing = capability.prerequisites.filter(
      (prerequisite) => !state.completed.includes(prerequisite),
    );
    if (missing.length > 0) {
      throw new CapabilityTransitionError(
        `Capability ${input.capabilityId} is blocked by: ${missing.join(", ")}`,
      );
    }
  }

  const completion = completeCapability(graph, state, input.capabilityId);
  const groupsAfter = evaluateWorkflowGroups(graph, groups, completion.state, facts);

  const beforeAvailable = new Set(
    getAvailableWorkflowGroups(graph, groups, state, facts).map(
      (evaluation) => evaluation.group.id,
    ),
  );
  const newlyUnlockedGroups = isReplay
    ? []
    : getAvailableWorkflowGroups(graph, groups, completion.state, facts)
        .filter((evaluation) => !beforeAvailable.has(evaluation.group.id))
        .map((evaluation) => evaluation.group);

  if (isReplay) {
    return {
      state: completion.state,
      completion,
      groupsBefore,
      groupsAfter,
      newlyUnlockedGroups: [],
      events: [],
    };
  }

  const actorId = input.actorId ?? null;
  const events: CapabilityTransitionEvent[] = [
    {
      eventType: "capability_completed",
      matterId: input.matterId,
      ownerId: input.ownerId,
      actorId,
      metadata: {
        capabilityId: input.capabilityId,
        previousCompletedCount: state.completed.length,
        completedCount: completion.state.completed.length,
      },
    },
    ...completion.newlyReachedMilestones.map((milestone) => ({
      eventType: "milestone_reached" as const,
      matterId: input.matterId,
      ownerId: input.ownerId,
      actorId,
      metadata: { milestoneId: milestone.id },
    })),
    ...newlyUnlockedGroups.map((group) => ({
      eventType: "workflow_group_unlocked" as const,
      matterId: input.matterId,
      ownerId: input.ownerId,
      actorId,
      metadata: { groupId: group.id },
    })),
  ];

  return {
    state: completion.state,
    completion,
    groupsBefore,
    groupsAfter,
    newlyUnlockedGroups,
    events,
  };
}

/**
 * Persist the lifecycle audit events after the caller has accepted the
 * returned state. Event persistence is intentionally separate from state
 * persistence so the application can place both behind one DB transaction.
 */
export async function recordCapabilityTransitionEvents(
  repository: MatterEventRepository,
  result: CapabilityTransitionResult,
): Promise<void> {
  await Promise.all(
    result.events.map((event) =>
      repository.record({
        matterId: event.matterId,
        ownerId: event.ownerId,
        eventType: event.eventType,
        actorId: event.actorId,
        metadata: event.metadata,
      }),
    ),
  );
}
