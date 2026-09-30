import { workflowByRuntimeId } from "./canonical-workflow-registry.js";
import { getNoticeResponseFactoryArtifact } from "./domain-packs/notice-response/factory-artifact.js";
import { createInsuranceAppealManifestForWorkflow } from "./domain-packs/appeal/insurance-manifest.js";
import { getInsuranceAppealRuntimePolicy } from "./domain-packs/appeal/insurance-runtime-policy.js";
import { getRecordsRequestFactoryArtifact } from "./domain-packs/records-request/factory-artifact.js";
import { getSsaReconsiderationFactoryArtifact } from "./domain-packs/appeal/ssa-reconsideration-factory-artifact.js";
import type { WorkflowManifest } from "./workflow-manifest.js";
import type { WorkflowRuntimePolicy } from "./matter-runtime-server.js";
import { WORKFLOW_REGISTRY } from "./canonical-workflow-registry.js";
import { composeWorkflowForChat } from "./workflow-factory.js";

export type ChatExecutionBinding = Readonly<{
  manifest: WorkflowManifest;
  policy: WorkflowRuntimePolicy;
}>;

/** Resolve only explicitly supported canonical platform workflows. */
export function chatExecutionBindingFor(workflowId: string): ChatExecutionBinding | null {
  const canonical = workflowByRuntimeId(workflowId);
  if (!canonical || canonical.execution?.kind !== "platform") return null;

  if (canonical.execution.policyFamily === "notice-response") {
    const artifact = getNoticeResponseFactoryArtifact(workflowId);
    return artifact?.factoryReady && canonical.sectionId === "notice-respond"
      ? { manifest: artifact.manifest, policy: artifact.runtimePolicy }
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
    const artifact = getRecordsRequestFactoryArtifact(workflowId);
    return artifact?.factoryReady && canonical.sectionId === "records-request"
      ? { manifest: artifact.manifest, policy: artifact.runtimePolicy }
      : null;
  }

  if (canonical.execution.policyFamily === "ssa-reconsideration") {
    const artifact = getSsaReconsiderationFactoryArtifact(workflowId);
    return artifact?.factoryReady && canonical.sectionId === "appeal-mail"
      ? { manifest: artifact.manifest, policy: artifact.runtimePolicy }
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
    return Object.freeze({
      id: workflow.id,
      maturity: workflow.maturity,
      policyFamily: workflow.execution?.kind === "platform" ? workflow.execution.policyFamily : null,
      chatExecutable: result?.chatExecutable === true,
      reason: result
        ? result.chatExecutable ? "certified" : "certification-failed"
        : workflow.execution?.kind === "platform" ? "chat-contract-not-registered" : "platform-runtime-not-registered",
      diagnostics: Object.freeze([
        ...(result?.diagnostics ?? []),
        ...(result?.chatReadiness.diagnostics ?? []),
      ]),
    });
  }));
}
