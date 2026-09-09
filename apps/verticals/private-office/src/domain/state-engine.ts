/**
 * State Engine — User Life State
 *
 * Deterministically derives available, locked, in-progress, and completed
 * capabilities from the capability graph and matter completion history.
 */

import type {
  Capability,
  CapabilityGraph,
  CapabilityMilestone,
} from "./capability-graph";

export type CapabilityStatus = "locked" | "available" | "in-progress" | "completed";

export interface UserCapabilityState {
  userId: string;
  completed: string[];
  inProgress: string[];
  reachedMilestones: string[];
  updatedAt: string;
}

export function createInitialState(userId: string): UserCapabilityState {
  return {
    userId,
    completed: [],
    inProgress: [],
    reachedMilestones: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getAvailableCapabilities(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): Capability[] {
  return Object.values(graph.capabilities).filter((capability) => {
    if (state.completed.includes(capability.id)) return false;
    if (state.inProgress.includes(capability.id)) return false;
    return capability.prerequisites.every((prerequisite) => state.completed.includes(prerequisite));
  });
}

export function getCompletedCapabilities(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): Capability[] {
  return state.completed
    .map((id) => graph.capabilities[id])
    .filter((capability): capability is Capability => capability !== undefined);
}

export function getLockedCapabilities(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): Capability[] {
  return Object.values(graph.capabilities).filter((capability) => {
    if (state.completed.includes(capability.id)) return false;
    if (state.inProgress.includes(capability.id)) return false;
    return !capability.prerequisites.every((prerequisite) => state.completed.includes(prerequisite));
  });
}

export function isCapabilityAvailable(
  graph: CapabilityGraph,
  state: UserCapabilityState,
  capabilityId: string,
): boolean {
  const capability = graph.capabilities[capabilityId];
  if (!capability) return false;
  if (state.completed.includes(capabilityId) || state.inProgress.includes(capabilityId)) return false;
  return capability.prerequisites.every((prerequisite) => state.completed.includes(prerequisite));
}

export function getCapabilityStatus(
  graph: CapabilityGraph,
  state: UserCapabilityState,
  capabilityId: string,
): CapabilityStatus {
  if (state.completed.includes(capabilityId)) return "completed";
  if (state.inProgress.includes(capabilityId)) return "in-progress";
  return isCapabilityAvailable(graph, state, capabilityId) ? "available" : "locked";
}

export function checkMilestones(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): string[] {
  return Object.values(graph.milestones)
    .filter((milestone) => !state.reachedMilestones.includes(milestone.id))
    .filter((milestone) => milestone.capabilities.every((capabilityId) => state.completed.includes(capabilityId)))
    .map((milestone) => milestone.id);
}

export function getMilestoneUnlocks(
  graph: CapabilityGraph,
  state: UserCapabilityState,
  milestoneId: string,
): Capability[] {
  const milestone = graph.milestones[milestoneId];
  if (!milestone) return [];
  return milestone.unlocks
    .map((id) => graph.capabilities[id])
    .filter((capability): capability is Capability => capability !== undefined)
    .filter((capability) => !state.completed.includes(capability.id));
}

export function startCapability(
  state: UserCapabilityState,
  capabilityId: string,
): UserCapabilityState {
  if (state.completed.includes(capabilityId) || state.inProgress.includes(capabilityId)) return state;
  return {
    ...state,
    inProgress: [...state.inProgress, capabilityId],
    updatedAt: new Date().toISOString(),
  };
}

export interface CompletionResult {
  state: UserCapabilityState;
  completedCapabilityId: string;
  newlyReachedMilestones: CapabilityMilestone[];
  newlyUnlockedCapabilities: Capability[];
}

export function completeCapability(
  graph: CapabilityGraph,
  state: UserCapabilityState,
  capabilityId: string,
): CompletionResult {
  const completed = state.completed.includes(capabilityId)
    ? state.completed
    : [...state.completed, capabilityId];
  const inProgress = state.inProgress.filter((id) => id !== capabilityId);

  const intermediateState: UserCapabilityState = {
    ...state,
    completed,
    inProgress,
    updatedAt: new Date().toISOString(),
  };

  const newMilestoneIds = checkMilestones(graph, intermediateState);
  const stateWithMilestones: UserCapabilityState = {
    ...intermediateState,
    reachedMilestones: [...state.reachedMilestones, ...newMilestoneIds],
  };

  const newlyUnlocked: Capability[] = [];
  for (const milestoneId of newMilestoneIds) {
    newlyUnlocked.push(...getMilestoneUnlocks(graph, stateWithMilestones, milestoneId));
  }

  const completedCapability = graph.capabilities[capabilityId];
  if (completedCapability) {
    for (const unlockId of completedCapability.unlocks) {
      if (completed.includes(unlockId) || state.inProgress.includes(unlockId)) continue;
      if (newlyUnlocked.some((capability) => capability.id === unlockId)) continue;
      const unlockedCapability = graph.capabilities[unlockId];
      if (!unlockedCapability) continue;
      const prerequisitesMet = unlockedCapability.prerequisites
        .filter((prerequisite) => prerequisite !== capabilityId)
        .every((prerequisite) => completed.includes(prerequisite));
      if (prerequisitesMet) newlyUnlocked.push(unlockedCapability);
    }
  }

  return {
    state: stateWithMilestones,
    completedCapabilityId: capabilityId,
    newlyReachedMilestones: newMilestoneIds
      .map((id) => graph.milestones[id])
      .filter((milestone): milestone is CapabilityMilestone => milestone !== undefined),
    newlyUnlockedCapabilities: newlyUnlocked,
  };
}

export interface LifeStateSummary {
  totalCompleted: number;
  totalInProgress: number;
  reachedMilestones: CapabilityMilestone[];
  availableCapabilities: Capability[];
  lockedCapabilities: Capability[];
}

export function getLifeStateSummary(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): LifeStateSummary {
  return {
    totalCompleted: state.completed.length,
    totalInProgress: state.inProgress.length,
    reachedMilestones: state.reachedMilestones
      .map((id) => graph.milestones[id])
      .filter((milestone): milestone is CapabilityMilestone => milestone !== undefined),
    availableCapabilities: getAvailableCapabilities(graph, state),
    lockedCapabilities: getLockedCapabilities(graph, state),
  };
}
