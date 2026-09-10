/** Goal planning and next-action recommendations over the capability graph. */

import type { Capability, CapabilityGraph } from "./capability-graph";
import type { UserCapabilityState } from "./state-engine";
import { getAvailableCapabilities } from "./state-engine";

export interface OrchestrationPath {
  goal: string;
  currentCapabilities: string[];
  path: string[];
  nextAvailable: string[];
  blockedBy: Record<string, string[]>;
  stepsRemaining: number;
}

export interface Recommendation {
  capability: Capability;
  reason: string;
  milestoneImpact: number;
}

function findAllPrerequisites(
  graph: CapabilityGraph,
  goalId: string,
  completed: string[],
): string[] {
  const needed = new Set<string>();
  const queue: string[] = [goalId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (completed.includes(current) || needed.has(current)) continue;
    needed.add(current);
    for (const prerequisite of graph.capabilities[current]?.prerequisites ?? []) {
      if (!completed.includes(prerequisite) && !needed.has(prerequisite)) queue.push(prerequisite);
    }
  }

  const sorted: string[] = [];
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visited.has(id) || completed.includes(id)) return;
    visited.add(id);
    for (const prerequisite of graph.capabilities[id]?.prerequisites ?? []) {
      if (needed.has(prerequisite)) visit(prerequisite);
    }
    sorted.push(id);
  };
  for (const id of needed) visit(id);
  return sorted;
}

export function planPath(
  graph: CapabilityGraph,
  state: UserCapabilityState,
  goalId: string,
): OrchestrationPath {
  if (!graph.capabilities[goalId] || state.completed.includes(goalId)) {
    return {
      goal: goalId,
      currentCapabilities: [...state.completed],
      path: [],
      nextAvailable: [],
      blockedBy: {},
      stepsRemaining: 0,
    };
  }

  const path = findAllPrerequisites(graph, goalId, state.completed);
  const availableIds = new Set(getAvailableCapabilities(graph, state).map((capability) => capability.id));
  const blockedBy: Record<string, string[]> = {};

  for (const stepId of path) {
    if (availableIds.has(stepId)) continue;
    const missing = (graph.capabilities[stepId]?.prerequisites ?? []).filter(
      (prerequisite) => !state.completed.includes(prerequisite),
    );
    if (missing.length > 0) blockedBy[stepId] = missing;
  }

  return {
    goal: goalId,
    currentCapabilities: [...state.completed],
    path,
    nextAvailable: path.filter((id) => availableIds.has(id)),
    blockedBy,
    stepsRemaining: path.length,
  };
}

function countDownstream(
  graph: CapabilityGraph,
  capabilityId: string,
  visited: Set<string>,
): number {
  if (visited.has(capabilityId)) return 0;
  visited.add(capabilityId);
  const capability = graph.capabilities[capabilityId];
  if (!capability) return 0;
  return capability.unlocks.reduce(
    (count, unlockId) => count + 1 + countDownstream(graph, unlockId, visited),
    0,
  );
}

export function recommendNext(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): Recommendation[] {
  return getAvailableCapabilities(graph, state)
    .map((capability) => {
      const milestoneImpact = capability.milestoneId ? 1 : 0;
      const downstreamCount = countDownstream(graph, capability.id, new Set());
      const reason = state.completed.length === 0
        ? "Start here — this is an available entry point."
        : capability.milestoneId
          ? `Completing this moves you toward the "${graph.milestones[capability.milestoneId]?.title}" milestone.`
          : downstreamCount > 0
            ? `This unlocks ${downstreamCount} downstream capabilit${downstreamCount === 1 ? "y" : "ies"}.`
            : "Available now — ready to start.";
      return { capability, reason, milestoneImpact };
    })
    .sort((a, b) => {
      if (b.milestoneImpact !== a.milestoneImpact) return b.milestoneImpact - a.milestoneImpact;
      const downstreamDelta =
        countDownstream(graph, b.capability.id, new Set()) -
        countDownstream(graph, a.capability.id, new Set());
      return downstreamDelta || a.capability.title.localeCompare(b.capability.title);
    });
}

export function findGoalCapability(
  graph: CapabilityGraph,
  goalText: string,
): Capability | undefined {
  const lower = goalText.trim().toLowerCase();
  if (!lower) return undefined;
  if (graph.capabilities[lower]) return graph.capabilities[lower];

  const capabilities = Object.values(graph.capabilities);
  const exactTitle = capabilities.find((capability) => capability.title.toLowerCase() === lower);
  if (exactTitle) return exactTitle;

  const direct = capabilities.find((capability) => {
    const haystack = `${capability.title} ${capability.description} ${capability.family}`.toLowerCase();
    return haystack.includes(lower) || lower.includes(capability.title.toLowerCase());
  });
  if (direct) return direct;

  const words = lower.split(/\s+/).filter((word) => word.length > 2);
  let bestMatch: Capability | undefined;
  let bestScore = 0;
  for (const capability of capabilities) {
    const haystack = `${capability.title} ${capability.description}`.toLowerCase();
    const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = capability;
    }
  }
  return bestMatch;
}
