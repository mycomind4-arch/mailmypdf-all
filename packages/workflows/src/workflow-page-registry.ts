import type { WorkflowAuthorityPage } from "./workflow-page-contract.js";
import { WORKFLOW_AUTHORITY_SECTIONS } from "./workflow-page-contract.js";
import { listWorkflowUniverse, WORKFLOW_UNIVERSE_COUNT } from "./workflow-universe-360.js";

export const WORKFLOW_AUTHORITY_PAGES: readonly WorkflowAuthorityPage[] = listWorkflowUniverse().map((workflow) => ({
  workflowId: workflow.workflowId,
  vertical: workflow.vertical,
  pipeline: workflow.pipeline,
  title: workflow.title,
  canonicalPath: workflow.canonicalPath,
  primaryIntent: workflow.title.toLowerCase(),
  maturity: "placeholder",
  authoritySections: WORKFLOW_AUTHORITY_SECTIONS,
  officialSources: [],
  relatedWorkflows: [],
}));

if (WORKFLOW_AUTHORITY_PAGES.length !== WORKFLOW_UNIVERSE_COUNT) {
  throw new Error(`Workflow authority catalog mismatch: ${WORKFLOW_AUTHORITY_PAGES.length} != ${WORKFLOW_UNIVERSE_COUNT}`);
}

export const workflowAuthorityPageIds = WORKFLOW_AUTHORITY_PAGES.map((page) => page.workflowId);

export function getWorkflowAuthorityPage(workflowId: string): WorkflowAuthorityPage | undefined {
  return WORKFLOW_AUTHORITY_PAGES.find((page) => page.workflowId === workflowId);
}
