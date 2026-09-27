import {
  createNoticeResponseManifest,
  getNoticeResponseWorkflowProfile,
  workflowProtocolDefinitionFromManifest,
  type WorkflowProtocolDefinition,
} from "@mailmypdf/workflows";

/**
 * MCP-facing registry of workflow protocol adapters.
 *
 * The universal protocol is shared; adapters only translate an existing
 * canonical manifest/domain pack into that protocol. Do not duplicate runtime
 * rules here. A null result means the workflow has not yet been registered for
 * chat-guided execution and must fail closed rather than letting an LLM invent
 * its step order.
 */
export function getMcpWorkflowProtocolDefinition(
  workflowId: string,
): WorkflowProtocolDefinition | null {
  const noticeProfile = getNoticeResponseWorkflowProfile(workflowId);
  if (noticeProfile) {
    return workflowProtocolDefinitionFromManifest(
      createNoticeResponseManifest({ profile: noticeProfile }),
    );
  }

  return null;
}
