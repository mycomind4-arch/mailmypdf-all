import { WORKFLOW_REGISTRY } from "./canonical-workflow-registry.js";

/** Compatibility API. Executable here means an existing start UI, not live fulfillment certification. */
export type WorkflowExecutionStatus = "executable" | "not-connected";

export interface WorkflowExecutionRecord {
  readonly sectionId: string;
  readonly workflowId: string;
  /** Top-level new-architecture path, e.g. appeal-mail/workflows/appeal-ssdi-denial. Never apps/verticals/**. */
  readonly topLevelPath: string;
  readonly publicHref: string;
  readonly workspaceHref: string;
  readonly executionStatus: WorkflowExecutionStatus;
  readonly executionHref: string | null;
}

export const WORKFLOW_EXECUTION_REGISTRY: readonly WorkflowExecutionRecord[] = Object.freeze(
  WORKFLOW_REGISTRY.map((workflow) => Object.freeze({
    sectionId: workflow.sectionId,
    workflowId: workflow.slug,
    topLevelPath: workflow.topLevelPath,
    publicHref: workflow.publicHref,
    workspaceHref: workflow.workspaceHref,
    executionStatus: workflow.execution ? "executable" as const : "not-connected" as const,
    executionHref: workflow.executionHref,
  })),
);

export const WORKFLOW_EXECUTION_REGISTRY_COUNT = WORKFLOW_EXECUTION_REGISTRY.length;

export function workflowExecutionRecord(sectionId: string, workflowId: string): WorkflowExecutionRecord | undefined {
  return WORKFLOW_EXECUTION_REGISTRY.find((record) => record.sectionId === sectionId && record.workflowId === workflowId);
}

export function workflowExecutionRecordForPath(workspaceHref: string): WorkflowExecutionRecord | undefined {
  return WORKFLOW_EXECUTION_REGISTRY.find((record) => record.workspaceHref === workspaceHref);
}

export function isWorkflowExecutable(sectionId: string, workflowId: string): boolean {
  return workflowExecutionRecord(sectionId, workflowId)?.executionStatus === "executable";
}
