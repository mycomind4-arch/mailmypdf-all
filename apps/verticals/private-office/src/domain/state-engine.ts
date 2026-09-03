/**
 * State Engine — User Life State
 *
 * Tracks what a user has completed, what's in progress, and which milestones
 * they've reached. Derives available capabilities from the capability graph.
 *
 * The state engine is the bridge between matter history and the capability graph:
 * when a matter is completed, the corresponding capability is marked complete,
 * which may trigger milestone transitions and unlock new capabilities.
 */

import type {
  Capability,
  CapabilityGraph,
  CapabilityMilestone,
} from "./capability-graph";

// ─── Types ───────────────────────────────────────────────────────────

export type CapabilityStatus = "locked" | "available" | "in-progress" | "completed";

export interface UserCapabilityState {
  userId: string;
  completed: string[];
  inProgress: string[];
  reachedMilestones: string[];
  updatedAt: string;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createInitialState(userId: string): UserCapabilityState {
  return {
    userId,
    completed: [],
    inProgress: [],
    reachedMilestones: [],
    updatedAt: new Date().toISOString(),
  };
}

// ─── Core Functions ──────────────────────────────────────────────────

/**
 * Get all capabilities that are available given the user's current state.
 * A capability is available if all its prerequisites are completed
 * and the capability itself is not yet completed or in progress.
 */
export function getAvailableCapabilities(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): Capability[] {
  return Object.values(graph.capabilities).filter((cap) => {
    if (state.completed.includes(cap.id)) return false;
    if (state.inProgress.includes(cap.id)) return false;
    return cap.prerequisites.every((prereq) => state.completed.includes(prereq));
  });
}

/**
 * Get all completed capabilities in the user's state.
 */
export function getCompletedCapabilities(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): Capability[] {
  return state.completed
    .map((id) => graph.capabilities[id])
    .filter((c): c is Capability => c !== undefined);
}

/**
 * Get all locked capabilities (prerequisites not yet met).
 */
export function getLockedCapabilities(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): Capability[] {
  return Object.values(graph.capabilities).filter((cap) => {
    if (state.completed.includes(cap.id)) return false;
    if (state.inProgress.includes(cap.id)) return false;
    return !cap.prerequisites.every((prereq) => state.completed.includes(prereq));
  });
}

/**
 * Check if a specific capability is available to the user.
 */
export function isCapabilityAvailable(
  graph: CapabilityGraph,
  state: UserCapabilityState,
  capabilityId: string,
): boolean {
  const cap = graph.capabilities[capabilityId];
  if (!cap) return false;
  if (state.completed.includes(capabilityId)) return false;
  if (state.inProgress.includes(capabilityId)) return false;
  return cap.prerequisites.every((prereq) => state.completed.includes(prereq));
}

/**
 * Get the status of a specific capability.
 */
export function getCapabilityStatus(
  graph: CapabilityGraph,
  state: UserCapabilityState,
  capabilityId: string,
): CapabilityStatus {
  if (state.completed.includes(capabilityId)) return "completed";
  if (state.inProgress.includes(capabilityId)) return "in-progress";
  const cap = graph.capabilities[capabilityId];
  if (!cap) return "locked";
  if (cap.prerequisites.every((prereq) => state.completed.includes(prereq))) {
    return "available";
  }
  return "locked";
}

/**
 * Check which milestones have been reached based on completed capabilities.
 * Returns milestone IDs that are newly reached (not already in state.reachedMilestones).
 */
export function checkMilestones(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): string[] {
  const newlyReached: string[] = [];
  for (const milestone of Object.values(graph.milestones)) {
    if (state.reachedMilestones.includes(milestone.id)) continue;
    const allCompleted = milestone.capabilities.every((capId) =>
      state.completed.includes(capId),
    );
    if (allCompleted) {
      newlyReached.push(milestone.id);
    }
  }
  return newlyReached;
}

/**
 * Get capabilities unlocked by reaching a milestone.
 * Returns capabilities from milestone.unlocks that aren't already completed.
 */
export function getMilestoneUnlocks(
  graph: CapabilityGraph,
  state: UserCapabilityState,
  milestoneId: string,
): Capability[] {
  const milestone = graph.milestones[milestoneId];
  if (!milestone) return [];
  return milestone.unlocks
    .map((id) => graph.capabilities[id])
    .filter((c): c is Capability => c !== undefined)
    .filter((c) => !state.completed.includes(c.id));
}

// ─── State Transitions ──────────────────────────────────────────────

/**
 * Mark a capability as in-progress.
 */
export function startCapability(
  state: UserCapabilityState,
  capabilityId: string,
): UserCapabilityState {
  if (state.completed.includes(capabilityId)) return state;
  if (state.inProgress.includes(capabilityId)) return state;
  return {
    ...state,
    inProgress: [...state.inProgress, capabilityId],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Complete a capability. This may trigger milestone transitions and unlock
 * new capabilities.
 *
 * Returns the updated state AND a description of what was unlocked.
 */
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
  // Remove from in-progress, add to completed
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

  // Check for newly reached milestones
  const newMilestoneIds = checkMilestones(graph, intermediateState);
  const reachedMilestones = [...state.reachedMilestones, ...newMilestoneIds];

  const stateWithMilestones: UserCapabilityState = {
    ...intermediateState,
    reachedMilestones,
  };

  // Collect capabilities unlocked by new milestones
  const newlyUnlocked: Capability[] = [];
  for (const msId of newMilestoneIds) {
    const unlocks = getMilestoneUnlocks(graph, stateWithMilestones, msId);
    newlyUnlocked.push(...unlocks);
  }

  // Also collect capabilities directly unlocked by this capability
  const cap = graph.capabilities[capabilityId];
  if (cap) {
    for (const unlockId of cap.unlocks) {
      if (
        !completed.includes(unlockId) &&
        !state.inProgress.includes(unlockId) &&
        !newlyUnlocked.some((c) => c.id === unlockId)
      ) {
        const unlockCap = graph.capabilities[unlockId];
        if (unlockCap) {
          // Check if all OTHER prerequisites are also met
          const otherPrereqsMet = unlockCap.prerequisites
            .filter((p) => p !== capabilityId)
            .every((p) => completed.includes(p));
          if (otherPrereqsMet) {
            newlyUnlocked.push(unlockCap);
          }
        }
      }
    }
  }

  const newMilestones = newMilestoneIds
    .map((id) => graph.milestones[id])
    .filter((m): m is CapabilityMilestone => m !== undefined);

  return {
    state: stateWithMilestones,
    completedCapabilityId: capabilityId,
    newlyReachedMilestones: newMilestones,
    newlyUnlockedCapabilities: newlyUnlocked,
  };
}

/**
 * Get a summary of the user's current life state.
 */
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
  const reachedMilestones = state.reachedMilestones
    .map((id) => graph.milestones[id])
    .filter((m): m is CapabilityMilestone => m !== undefined);

  return {
    totalCompleted: state.completed.length,
    totalInProgress: state.inProgress.length,
    reachedMilestones,
    availableCapabilities: getAvailableCapabilities(graph, state),
    lockedCapabilities: getLockedCapabilities(graph, state),
  };
}
