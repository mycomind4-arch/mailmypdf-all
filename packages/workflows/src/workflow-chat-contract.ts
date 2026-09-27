export const WORKFLOW_RUNTIME_CHAT_CONTRACT_VERSION =
  "mailmypdf.workflow-runtime-contract/v1" as const;

export type WorkflowRuntimeChatInputField = Readonly<{
  id: string;
  required: boolean;
}>;

export type WorkflowRuntimeChatConnectorField = Readonly<{
  id: string;
  required: boolean;
  toolName: string;
  argumentName: string;
}>;

export type WorkflowRuntimeChatContract = Readonly<{
  schemaVersion: typeof WORKFLOW_RUNTIME_CHAT_CONTRACT_VERSION;
  sourceDocument: "required" | "optional" | "none";
  inputFields: readonly WorkflowRuntimeChatInputField[];
  connectorFields?: readonly WorkflowRuntimeChatConnectorField[];
  enforcedGateIds: readonly string[];
}>;

export function defineWorkflowRuntimeChatContract(
  input: Omit<WorkflowRuntimeChatContract, "schemaVersion">,
): WorkflowRuntimeChatContract {
  return Object.freeze({
    schemaVersion: WORKFLOW_RUNTIME_CHAT_CONTRACT_VERSION,
    sourceDocument: input.sourceDocument,
    inputFields: Object.freeze(input.inputFields.map((field) => Object.freeze({ ...field }))),
    connectorFields: Object.freeze(
      (input.connectorFields ?? []).map((field) => Object.freeze({ ...field })),
    ),
    enforcedGateIds: Object.freeze([...input.enforcedGateIds]),
  });
}
