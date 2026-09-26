import { getInsuranceAppealRuntimePolicy } from "./domain-packs/appeal/insurance-runtime-policy.js";
import { getSsaReconsiderationRuntimePolicy } from "./domain-packs/appeal/ssa-reconsideration-runtime-policy.js";
import { getImmigrationRuntimePolicy } from "./domain-packs/immigration/cover-letter-runtime-policy.js";
import { getRecordsRequestRuntimePolicy } from "./domain-packs/records-request/runtime-policy.js";
import { getNoticeResponseRuntimePolicy } from "./domain-packs/notice-response/runtime-policy.js";
import { workflowByRuntimeId, type RuntimePolicyFamily } from "./canonical-workflow-registry.js";
import type { WorkflowRuntimePolicyProvider } from "./runtime-policy-registry.js";
import type { WorkflowRuntimePolicy } from "./matter-runtime-server.js";

/**
 * Canonical host-facing runtime policy resolver for workflows migrated into the
 * new shared architecture. Add new vertical/domain providers here as they are
 * migrated; hosts should not hard-code workflow IDs themselves.
 */
const providers: Record<RuntimePolicyFamily, WorkflowRuntimePolicyProvider> = {
  "insurance-appeal": getInsuranceAppealRuntimePolicy,
  "ssa-reconsideration": getSsaReconsiderationRuntimePolicy,
  "immigration-cover-letter": getImmigrationRuntimePolicy,
  "records-request": getRecordsRequestRuntimePolicy,
  "notice-response": getNoticeResponseRuntimePolicy,
};

export function platformWorkflowRuntimePolicyFor(workflowId: string): WorkflowRuntimePolicy | null {
  const workflow = workflowByRuntimeId(workflowId);
  if (!workflow || workflow.execution?.kind !== "platform") return null;
  const policy = providers[workflow.execution.policyFamily](workflow.slug);
  if (!policy) throw new Error(`Missing runtime policy for '${workflow.id}'.`);
  return policy;
}
