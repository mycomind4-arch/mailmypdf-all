import type { CapabilityGraph } from "./capability-graph";
import type { UserCapabilityState } from "./state-engine";
import {
  evaluateRequirement,
  type RequirementContext,
  type RequirementRule,
} from "./requirement-rules";
import type { WorkflowGroupCompletionRule, WorkflowGroupDefinition } from "./workflow-groups";

export type WorkflowGroupStatus = "locked" | "available" | "in-progress" | "completed";

export interface WorkflowGroupEvaluation {
  group: WorkflowGroupDefinition;
  status: WorkflowGroupStatus;
  completedWorkflowCount: number;
  totalWorkflowCount: number;
  missing: string[];
}

export function createRequirementContext(
  state: UserCapabilityState,
  facts: Readonly<Record<string, unknown>> = {},
): RequirementContext {
  return { completed: new Set(state.completed), facts };
}

function completionEvaluation(
  rule: WorkflowGroupCompletionRule,
  context: RequirementContext,
): { satisfied: boolean; missing: string[] } {
  switch (rule.type) {
    case "all-required":
      return evaluateRequirement(
        { type: "all", rules: rule.capabilityIds.map((capabilityId) => ({ type: "capability", capabilityId })) },
        context,
      );
    case "core-plus-optional":
      return evaluateRequirement(
        { type: "all", rules: rule.coreCapabilityIds.map((capabilityId) => ({ type: "capability", capabilityId })) },
        context,
      );
    case "threshold":
      return evaluateRequirement(
        {
          type: "threshold",
          minimum: rule.minimum,
          rules: rule.capabilityIds.map((capabilityId) => ({ type: "capability", capabilityId })),
        },
        context,
      );
    case "requirement":
      return evaluateRequirement(rule.requirement, context);
  }
}

function workflowCount(group: WorkflowGroupDefinition, state: UserCapabilityState): number {
  return group.workflowIds.filter((workflowId) => state.completed.includes(workflowId)).length;
}

export function evaluateWorkflowGroup(
  graph: CapabilityGraph,
  group: WorkflowGroupDefinition,
  state: UserCapabilityState,
  facts: Readonly<Record<string, unknown>> = {},
): WorkflowGroupEvaluation {
  const context = createRequirementContext(state, facts);
  const unlock = group.unlockRequirement
    ? evaluateRequirement(group.unlockRequirement, context)
    : { satisfied: true, missing: [] };
  const completion = completionEvaluation(group.completionRule, context);
  const completedWorkflowCount = workflowCount(group, state);

  let status: WorkflowGroupStatus;
  if (completion.satisfied) {
    status = "completed";
  } else if (!unlock.satisfied) {
    status = "locked";
  } else if (completedWorkflowCount > 0 || hasAnyCapabilityProgress(group, state)) {
    status = "in-progress";
  } else {
    status = "available";
  }

  return {
    group,
    status,
    completedWorkflowCount,
    totalWorkflowCount: group.workflowIds.length,
    missing: [...new Set([...unlock.missing, ...completion.missing])],
  };
}

function hasAnyCapabilityProgress(group: WorkflowGroupDefinition, state: UserCapabilityState): boolean {
  return group.workflowIds.some((workflowId) =>
    state.inProgress.includes(workflowId) || state.completed.includes(workflowId),
  );
}

export function evaluateWorkflowGroups(
  graph: CapabilityGraph,
  groups: readonly WorkflowGroupDefinition[],
  state: UserCapabilityState,
  facts: Readonly<Record<string, unknown>> = {},
): WorkflowGroupEvaluation[] {
  return groups.map((group) => evaluateWorkflowGroup(graph, group, state, facts));
}

export function getAvailableWorkflowGroups(
  graph: CapabilityGraph,
  groups: readonly WorkflowGroupDefinition[],
  state: UserCapabilityState,
  facts: Readonly<Record<string, unknown>> = {},
): WorkflowGroupEvaluation[] {
  return evaluateWorkflowGroups(graph, groups, state, facts).filter(
    (evaluation) => evaluation.status === "available" || evaluation.status === "in-progress",
  );
}

/** Return groups that became newly available after a state transition. */
export function getNewlyUnlockedWorkflowGroups(
  graph: CapabilityGraph,
  groups: readonly WorkflowGroupDefinition[],
  before: UserCapabilityState,
  after: UserCapabilityState,
  facts: Readonly<Record<string, unknown>> = {},
): WorkflowGroupDefinition[] {
  const beforeIds = new Set(
    getAvailableWorkflowGroups(graph, groups, before, facts).map((evaluation) => evaluation.group.id),
  );
  return getAvailableWorkflowGroups(graph, groups, after, facts)
    .filter((evaluation) => !beforeIds.has(evaluation.group.id))
    .map((evaluation) => evaluation.group);
}

/** Return a deterministic explanation for why a group is locked. */
export function explainGroupLock(
  group: WorkflowGroupDefinition,
  state: UserCapabilityState,
  facts: Readonly<Record<string, unknown>> = {},
): string[] {
  const context = createRequirementContext(state, facts);
  const requirements: RequirementRule[] = [];
  if (group.unlockRequirement) requirements.push(group.unlockRequirement);
  const completion = completionEvaluation(group.completionRule, context);
  return [
    ...new Set([
      ...(requirements.flatMap((rule) => evaluateRequirement(rule, context).missing)),
      ...completion.missing,
    ]),
  ];
}
