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
import { WORKFLOW_REGISTRY } from "./canonical-workflow-registry.js";
import { composeWorkflowForChat } from "./workflow-factory.js";
import { planWorkflowArtifacts, type WorkflowArtifactPlan } from "./workflow-artifact-plan.js";

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

/** Build a complete, reproducible factory queue from canonical identity and live tool names. */
export function canonicalChatFactoryReport(availableTools: ReadonlySet<string> | readonly string[]) {
  return Object.freeze(WORKFLOW_REGISTRY.map((workflow) => {
    const binding = chatExecutionBindingFor(workflow.slug);
    const result = binding
      ? composeWorkflowForChat({
          manifest: binding.manifest,
          runtimePolicy: binding.policy,
          availableTools,
        })
      : null;
    const artifactPlan = binding
      ? planWorkflowArtifacts({
          canonical: workflow,
          manifest: binding.manifest,
          runtimePolicy: binding.policy,
          availableTools,
        })
      : null;
    return Object.freeze({
      id: workflow.id,
      maturity: workflow.maturity,
      policyFamily: workflow.execution?.kind === "platform" ? workflow.execution.policyFamily : null,
      chatExecutable: result?.chatExecutable === true,
      reason: result
        ? result.chatExecutable ? "certified" : "certification-failed"
        : workflow.execution?.kind === "platform" ? "chat-contract-not-registered" : "platform-runtime-not-registered",
      artifactPlan,
      diagnostics: Object.freeze([
        ...(result?.diagnostics ?? []),
        ...(result?.chatReadiness.diagnostics ?? []),
      ]),
    });
  }));
}


/**
 * Return the complete side-effect-free factory artifact plan for one canonical
 * platform workflow. Null means the canonical workflow has no registered
 * platform runtime binding yet; callers must not invent one.
 */
export function canonicalWorkflowArtifactPlan(
  workflowId: string,
  availableTools: ReadonlySet<string> | readonly string[],
): WorkflowArtifactPlan | null {
  const canonical = workflowByRuntimeId(workflowId);
  const binding = chatExecutionBindingFor(workflowId);
  if (!canonical || !binding) return null;
  return planWorkflowArtifacts({
    canonical,
    manifest: binding.manifest,
    runtimePolicy: binding.policy,
    availableTools,
  });
}
