import { workflowByRuntimeId } from "./canonical-workflow-registry.js";
import { createNoticeResponseManifest } from "./domain-packs/notice-response/manifest.js";
import { getNoticeResponseWorkflowProfile } from "./domain-packs/notice-response/profiles.js";
import { getNoticeResponseRuntimePolicy } from "./domain-packs/notice-response/runtime-policy.js";
import { createInsuranceAppealManifestForWorkflow } from "./domain-packs/appeal/insurance-manifest.js";
import { getInsuranceAppealRuntimePolicy } from "./domain-packs/appeal/insurance-runtime-policy.js";
import { createRecordsRequestManifest } from "./domain-packs/records-request/manifest.js";
import { getRecordsRequestRuntimePolicy } from "./domain-packs/records-request/runtime-policy.js";
import type { WorkflowManifest } from "./workflow-manifest.js";
import type { WorkflowRuntimePolicy } from "./matter-runtime-server.js";

export type ChatExecutionBinding = Readonly<{
  manifest: WorkflowManifest;
  policy: WorkflowRuntimePolicy;
}>;

/** Resolve only explicitly supported canonical platform workflows. */
export function chatExecutionBindingFor(workflowId: string): ChatExecutionBinding | null {
  const canonical = workflowByRuntimeId(workflowId);
  if (!canonical || canonical.execution?.kind !== "platform") return null;

  if (canonical.execution.policyFamily === "notice-response") {
    const profile = getNoticeResponseWorkflowProfile(workflowId);
    const policy = getNoticeResponseRuntimePolicy(workflowId);
    return profile && policy && canonical.sectionId === "notice-respond"
      ? { manifest: createNoticeResponseManifest({ profile }), policy }
      : null;
  }

  if (canonical.execution.policyFamily === "insurance-appeal") {
    const definition = createInsuranceAppealManifestForWorkflow(workflowId);
    const policy = getInsuranceAppealRuntimePolicy(workflowId);
    return definition && policy && canonical.sectionId === "appeal-mail"
      ? { manifest: definition.manifest, policy }
      : null;
  }

  if (canonical.execution.policyFamily === "records-request") {
    const policy = getRecordsRequestRuntimePolicy(workflowId);
    return policy && canonical.sectionId === "records-request"
      ? {
          manifest: createRecordsRequestManifest({
            workflowId: workflowId as Parameters<typeof createRecordsRequestManifest>[0]["workflowId"],
            title: canonical.label,
          }).manifest,
          policy,
        }
      : null;
  }

  return null;
}
