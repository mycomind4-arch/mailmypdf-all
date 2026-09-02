import type { CapabilityGraph } from "./capability-graph";
import type { UserCapabilityState } from "./state-engine";

export interface WorkflowCapabilityMatch {
  capabilityId: string;
  workflowId: string;
  prerequisites: readonly string[];
}

/** Resolve the graph capability represented by an executable workflow. */
export function findCapabilityForWorkflow(
  graph: CapabilityGraph,
  workflowId: string,
): WorkflowCapabilityMatch | null {
  const entry = Object.entries(graph.capabilities).find(
    ([, capability]) => capability.workflowId === workflowId,
  );

  if (!entry) return null;

  const [capabilityId, capability] = entry;
  return {
    capabilityId,
    workflowId,
    prerequisites: capability.prerequisites,
  };
}

/**
 * Validate the graph-side prerequisites before an authoritative matter can
 * be completed. This is a preflight guard; persistence should still enforce
 * the final state transition atomically when the production transaction layer
 * is available.
 */
export function getMissingWorkflowCapabilityPrerequisites(
  graph: CapabilityGraph,
  state: UserCapabilityState,
  workflowId: string,
): string[] {
  const match = findCapabilityForWorkflow(graph, workflowId);
  if (!match) return [];

  return match.prerequisites.filter(
    (prerequisite) => !state.completed.includes(prerequisite),
  );
}
