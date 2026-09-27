import {
  composeWorkflowForChat,
  createNoticeResponseManifest,
  createRecordsRequestManifest,
  getNoticeResponseRuntimePolicy,
  getNoticeResponseWorkflowProfile,
  getRecordsRequestRuntimePolicy,
  workflowProtocolDefinitionFromManifest,
  type WorkflowChatReadinessCertification,
  type WorkflowManifest,
  type WorkflowProtocolDefinition,
  type WorkflowRuntimePolicy,
} from "@mailmypdf/workflows";
import { workflowByRuntimeId } from "@mailmypdf/workflows/canonical-registry";
import { MAILMYPDF_MCP_TOOLS } from "./tool-catalog";

export type McpWorkflowProtocolRegistration = Readonly<{
  definition: WorkflowProtocolDefinition | null;
  certification: WorkflowChatReadinessCertification;
}>;

function manifestAndPolicy(workflowId: string): {
  manifest: WorkflowManifest;
  policy: WorkflowRuntimePolicy | null;
} | null {
  const noticeProfile = getNoticeResponseWorkflowProfile(workflowId);
  if (noticeProfile) {
    return {
      manifest: createNoticeResponseManifest({ profile: noticeProfile }),
      policy: getNoticeResponseRuntimePolicy(workflowId),
    };
  }

  const recordsPolicy = getRecordsRequestRuntimePolicy(workflowId);
  if (recordsPolicy) {
    const canonical = workflowByRuntimeId(workflowId);
    if (!canonical || canonical.sectionId !== "records-request") return null;
    return {
      manifest: createRecordsRequestManifest({
        workflowId: workflowId as Parameters<typeof createRecordsRequestManifest>[0]["workflowId"],
        title: canonical.label,
      }).manifest,
      policy: recordsPolicy,
    };
  }

  return null;
}

/**
 * Certify a workflow before exposing it to chat-guided execution.
 *
 * The certification compares the manifest, runtime policy's declarative chat
 * contract, and the actual MCP tool surface. A workflow with any mismatch
 * remains visible in the product catalog but does not receive an executable
 * workflow protocol definition.
 */
export function getMcpWorkflowProtocolRegistration(
  workflowId: string,
): McpWorkflowProtocolRegistration | null {
  const resolved = manifestAndPolicy(workflowId);
  if (!resolved) return null;

  const factory = composeWorkflowForChat({
    manifest: resolved.manifest,
    runtimePolicy: resolved.policy,
    availableTools: MAILMYPDF_MCP_TOOLS.map((tool) => tool.name),
  });
  const certification = factory.chatReadiness;

  return Object.freeze({
    certification,
    definition: factory.chatExecutable && resolved.policy?.chatContract
      ? workflowProtocolDefinitionFromManifest(
          resolved.manifest,
          resolved.policy.chatContract,
        )
      : null,
  });
}

/**
 * Compatibility helper for callers that only need an executable definition.
 * An uncertified workflow deliberately returns null.
 */
export function getMcpWorkflowProtocolDefinition(
  workflowId: string,
): WorkflowProtocolDefinition | null {
  return getMcpWorkflowProtocolRegistration(workflowId)?.definition ?? null;
}
