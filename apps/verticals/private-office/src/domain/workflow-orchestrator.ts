/**
 * Workflow Orchestrator — Goal Planning & Recommendations
 *
 * Given a user's current state and a goal capability, determines the path
 * through the capability graph. Also provides recommendations for what to
 * do next based on current state.
 *
 * This is the "What can I do next?" engine.
 */

import type {
  Capability,
  CapabilityGraph,
} from "./capability-graph";
import type { UserCapabilityState } from "./state-engine";
import { getAvailableCapabilities } from "./state-engine";

// ─── Types ───────────────────────────────────────────────────────────

export interface OrchestrationPath {
  goal: string;
  currentCapabilities: string[];
  /** Ordered steps from current state to the goal */
  path: string[];
  /** What can be done right now (first step) */
  nextAvailable: string[];
  /** What's blocking each step that isn't yet available */
  blockedBy: Record<string, string[]>;
  /** Total steps remaining */
  stepsRemaining: number;
}

export interface Recommendation {
  capability: Capability;
  reason: string;
  /** How many milestones this capability contributes to */
  milestoneImpact: number;
}

// ─── Path Planning ───────────────────────────────────────────────────

/**
 * Find all prerequisites for a goal capability, including transitive deps.
 * Returns them in topological order (prerequisites before dependents).
 */
function findAllPrerequisites(
  graph: CapabilityGraph,
  goalId: string,
  completed: string[],
): string[] {
  const needed = new Set<string>();
  const queue: string[] = [goalId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (completed.includes(current)) continue;
    if (needed.has(current)) continue;

    needed.add(current);

    const cap = graph.capabilities[current];
    if (cap) {
      for (const prereq of cap.prerequisites) {
        if (!completed.includes(prereq) && !needed.has(prereq)) {
          queue.push(prereq);
        }
      }
    }
  }

  // Topological sort
  const sorted: string[] = [];
  const visited = new Set<string>();

  function visit(id: string) {
    if (visited.has(id)) return;
    if (completed.includes(id)) return;
    visited.add(id);

    const cap = graph.capabilities[id];
    if (cap) {
      for (const prereq of cap.prerequisites) {
        if (needed.has(prereq) && !visited.has(prereq)) {
          visit(prereq);
        }
      }
    }
    sorted.push(id);
  }

  for (const id of needed) {
    visit(id);
  }

  return sorted;
}

/**
 * Plan a path from the user's current state to a goal capability.
 *
 * Returns ordered steps, what's available now, and what's blocking.
 */
export function planPath(
  graph: CapabilityGraph,
  state: UserCapabilityState,
  goalId: string,
): OrchestrationPath {
  const goal = graph.capabilities[goalId];
  if (!goal) {
    return {
      goal: goalId,
      currentCapabilities: [...state.completed],
      path: [],
      nextAvailable: [],
      blockedBy: {},
      stepsRemaining: 0,
    };
  }

  // If goal is already completed
  if (state.completed.includes(goalId)) {
    return {
      goal: goalId,
      currentCapabilities: [...state.completed],
      path: [],
      nextAvailable: [],
      blockedBy: {},
      stepsRemaining: 0,
    };
  }

  // Find all needed prerequisites in topological order
  const path = findAllPrerequisites(graph, goalId, state.completed);

  // Determine what's available right now
  const available = getAvailableCapabilities(graph, state);
  const availableIds = available.map((c) => c.id);
  const nextAvailable = path.filter((id) => availableIds.includes(id));

  // Determine what's blocking each step
  const blockedBy: Record<string, string[]> = {};
  for (const stepId of path) {
    if (availableIds.includes(stepId)) continue;
    const cap = graph.capabilities[stepId];
    if (cap) {
      const missing = cap.prerequisites.filter(
        (p) => !state.completed.includes(p),
      );
      if (missing.length > 0) {
        blockedBy[stepId] = missing;
      }
    }
  }

  return {
    goal: goalId,
    currentCapabilities: [...state.completed],
    path,
    nextAvailable,
    blockedBy,
    stepsRemaining: path.length,
  };
}

// ─── Recommendations ─────────────────────────────────────────────────

/**
 * Recommend what the user should do next, based on their current state.
 *
 * Prioritizes capabilities that:
 * 1. Contribute to a milestone (higher milestone impact = higher priority)
 * 2. Are entry points if nothing has been done yet
 * 3. Unlock the most downstream capabilities
 */
export function recommendNext(
  graph: CapabilityGraph,
  state: UserCapabilityState,
): Recommendation[] {
  const available = getAvailableCapabilities(graph, state);

  if (available.length === 0) {
    return [];
  }

  const recommendations: Recommendation[] = available.map((cap) => {
    // Count milestone impact — how many milestones this capability contributes to
    let milestoneImpact = 0;
    if (cap.milestoneId) {
      milestoneImpact = 1;
    }

    // Count downstream unlocks (transitive)
    const downstreamCount = countDownstream(graph, cap.id, new Set());

    const reason =
      state.completed.length === 0
        ? `Start here — this is the first step in your journey.`
        : cap.milestoneId
          ? `Completing this moves you toward the "${graph.milestones[cap.milestoneId]?.title}" milestone.`
          : downstreamCount > 0
            ? `This unlocks ${downstreamCount} downstream capabilit${downstreamCount === 1 ? "y" : "ies"}.`
            : `Available now — ready to start.`;

    return {
      capability: cap,
      reason,
      milestoneImpact,
    };
  });

  // Sort by: milestone impact (desc), then downstream unlocks (desc), then title
  recommendations.sort((a, b) => {
    if (b.milestoneImpact !== a.milestoneImpact) {
      return b.milestoneImpact - a.milestoneImpact;
    }
    const aDownstream = countDownstream(graph, a.capability.id, new Set());
    const bDownstream = countDownstream(graph, b.capability.id, new Set());
    if (bDownstream !== aDownstream) {
      return bDownstream - aDownstream;
    }
    return a.capability.title.localeCompare(b.capability.title);
  });

  return recommendations;
}

function countDownstream(
  graph: CapabilityGraph,
  capId: string,
  visited: Set<string>,
): number {
  if (visited.has(capId)) return 0;
  visited.add(capId);

  const cap = graph.capabilities[capId];
  if (!cap) return 0;

  let count = cap.unlocks.length;
  for (const unlockId of cap.unlocks) {
    count += countDownstream(graph, unlockId, visited);
  }
  return count;
}

// ─── Goal Parsing ────────────────────────────────────────────────────

/**
 * Given a natural-language goal, find the matching capability.
 * This is a simple keyword matcher — can be upgraded to LLM-based matching.
 */
export function findGoalCapability(
  graph: CapabilityGraph,
  goalText: string,
): Capability | undefined {
  const lower = goalText.toLowerCase();

  // Exact id match
  if (graph.capabilities[lower]) {
    return graph.capabilities[lower];
  }

  // Title match
  for (const cap of Object.values(graph.capabilities)) {
    if (cap.title.toLowerCase() === lower) {
      return cap;
    }
  }

  // Keyword match in title or description
  for (const cap of Object.values(graph.capabilities)) {
    const haystack = `${cap.title} ${cap.description} ${cap.family}`.toLowerCase();
    if (haystack.includes(lower) || lower.includes(cap.title.toLowerCase())) {
      return cap;
    }
  }

  // Partial keyword matching
  const words = lower.split(/\s+/).filter((w) => w.length > 2);
  let bestMatch: Capability | undefined;
  let bestScore = 0;

  for (const cap of Object.values(graph.capabilities)) {
    const haystack = `${cap.title} ${cap.description}`.toLowerCase();
    let score = 0;
    for (const word of words) {
      if (haystack.includes(word)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cap;
    }
  }

  return bestMatch;
}
