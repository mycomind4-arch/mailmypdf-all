import type { WorkflowManifest } from "./workflow-manifest.js";
import type { WorkflowRuntimePolicy } from "./matter-runtime-server.js";
import type {
  WorkflowRuntimeChatContract,
  WorkflowRuntimeChatConnectorField,
} from "./workflow-chat-contract.js";

export const WORKFLOW_CHAT_READINESS_VERSION =
  "mailmypdf.chat-readiness/v1" as const;

export type WorkflowChatReadinessDiagnosticCode =
  | "RUNTIME_CHAT_CONTRACT_MISSING"
  | "SOURCE_DOCUMENT_CONTRACT_MISMATCH"
  | "REQUEST_FIRST_ANALYSIS_MISSING"
  | "MANIFEST_FIELD_UNBOUND"
  | "RUNTIME_FIELD_NOT_IN_MANIFEST"
  | "FIELD_REQUIREDNESS_MISMATCH"
  | "DUPLICATE_RUNTIME_FIELD_BINDING"
  | "UNSUPPORTED_CONNECTOR_FIELD_BINDING"
  | "REQUIRED_GATE_NOT_ENFORCED"
  | "UNKNOWN_ENFORCED_GATE"
  | "CONNECTOR_TOOL_MISSING";

export type WorkflowChatReadinessDiagnostic = Readonly<{
  code: WorkflowChatReadinessDiagnosticCode;
  message: string;
  fieldId?: string;
  gateId?: string;
  toolName?: string;
}>;

export type WorkflowChatReadinessCertification = Readonly<{
  schemaVersion: typeof WORKFLOW_CHAT_READINESS_VERSION;
  workflowId: string;
  certified: boolean;
  requiredTools: readonly string[];
  diagnostics: readonly WorkflowChatReadinessDiagnostic[];
}>;

function manifestFields(manifest: WorkflowManifest) {
  const fields = new Map<string, { required: boolean }>();
  for (const step of manifest.steps ?? []) {
    for (const field of step.fields ?? []) {
      fields.set(field.id, { required: field.required });
    }
  }
  return fields;
}

function expectedSourceDocument(
  manifest: WorkflowManifest,
): WorkflowRuntimeChatContract["sourceDocument"] {
  const primary = (manifest.documents ?? []).filter((document) => document.role === "primary");
  if (primary.some((document) => document.required)) return "required";
  if (primary.length > 0) return "optional";
  return "none";
}

function outputRequires(
  manifest: WorkflowManifest,
  kind: NonNullable<WorkflowManifest["outputs"]>[number]["kind"],
): boolean {
  return (manifest.outputs ?? []).some((output) => output.required && output.kind === kind);
}

export function requiredConnectorToolsForWorkflow(
  manifest: WorkflowManifest,
  contract: WorkflowRuntimeChatContract,
): readonly string[] {
  const required = new Set<string>(["create_matter", "get_workflow_state"]);

  if (contract.inputFields.length > 0) required.add("save_matter_input");
  if (contract.sourceDocument !== "none") {
    required.add("ingest_document");
    required.add("get_document_status");
  }
  if (manifest.primaryInput === "document") required.add("analyze_matter");

  if (
    outputRequires(manifest, "draft") ||
    outputRequires(manifest, "pdf") ||
    outputRequires(manifest, "packet")
  ) {
    required.add("generate_draft");
    required.add("save_draft");
  }

  if (
    outputRequires(manifest, "pdf") ||
    outputRequires(manifest, "packet") ||
    manifest.allowsConsequentialAction
  ) {
    required.add("preview_packet");
    required.add("approve_packet");
  }

  if (
    outputRequires(manifest, "receipt") ||
    outputRequires(manifest, "tracking") ||
    outputRequires(manifest, "proof") ||
    outputRequires(manifest, "archive") ||
    manifest.requiredCapabilities.includes("payment") ||
    manifest.requiredCapabilities.includes("mailing")
  ) {
    required.add("prepare_checkout");
    required.add("get_order_status");
  }

  for (const binding of contract.connectorFields ?? []) {
    required.add(binding.toolName);
  }

  return Object.freeze([...required].sort());
}

function supportedConnectorFieldBinding(
  binding: WorkflowRuntimeChatConnectorField,
): boolean {
  return binding.toolName === "preview_packet" && binding.argumentName === "recipient";
}

export function certifyWorkflowChatReadiness(input: {
  manifest: WorkflowManifest;
  runtimePolicy: WorkflowRuntimePolicy | null;
  availableTools: ReadonlySet<string> | readonly string[];
}): WorkflowChatReadinessCertification {
  const diagnostics: WorkflowChatReadinessDiagnostic[] = [];
  const availableTools =
    input.availableTools instanceof Set
      ? input.availableTools
      : new Set(input.availableTools);
  const contract = input.runtimePolicy?.chatContract;

  if (!contract) {
    return Object.freeze({
      schemaVersion: WORKFLOW_CHAT_READINESS_VERSION,
      workflowId: input.manifest.id,
      certified: false,
      requiredTools: Object.freeze([]),
      diagnostics: Object.freeze([
        {
          code: "RUNTIME_CHAT_CONTRACT_MISSING",
          message: "The runtime policy does not declare a chat-execution contract.",
        },
      ]),
    });
  }

  const expectedSource = expectedSourceDocument(input.manifest);
  if (contract.sourceDocument !== expectedSource) {
    diagnostics.push({
      code: "SOURCE_DOCUMENT_CONTRACT_MISMATCH",
      message:
        `Manifest source-document mode is ${expectedSource}, but the runtime chat contract declares ${contract.sourceDocument}.`,
    });
  }

  const policyRequiresSource = input.runtimePolicy?.requiresSourceDocument !== false;
  if (
    (contract.sourceDocument === "required") !== policyRequiresSource
  ) {
    diagnostics.push({
      code: "SOURCE_DOCUMENT_CONTRACT_MISMATCH",
      message:
        "Runtime requiresSourceDocument and the declared chat source-document mode disagree.",
    });
  }

  const draftRequired =
    outputRequires(input.manifest, "draft") ||
    outputRequires(input.manifest, "pdf") ||
    outputRequires(input.manifest, "packet");
  if (
    contract.sourceDocument !== "required" &&
    draftRequired &&
    input.manifest.primaryInput !== "document" &&
    !input.runtimePolicy?.createAnalysisFromInput
  ) {
    diagnostics.push({
      code: "REQUEST_FIRST_ANALYSIS_MISSING",
      message:
        "A request-first workflow that drafts without a required source document must provide createAnalysisFromInput.",
    });
  }

  const manifestFieldMap = manifestFields(input.manifest);
  const runtimeBindings = new Map<
    string,
    { required: boolean; connector?: WorkflowRuntimeChatConnectorField }
  >();

  for (const field of contract.inputFields) {
    if (runtimeBindings.has(field.id)) {
      diagnostics.push({
        code: "DUPLICATE_RUNTIME_FIELD_BINDING",
        fieldId: field.id,
        message: `Runtime chat field ${field.id} is bound more than once.`,
      });
      continue;
    }
    runtimeBindings.set(field.id, { required: field.required });
  }

  for (const field of contract.connectorFields ?? []) {
    const existing = runtimeBindings.get(field.id);
    if (existing?.connector) {
      diagnostics.push({
        code: "DUPLICATE_RUNTIME_FIELD_BINDING",
        fieldId: field.id,
        message: `Runtime chat connector field ${field.id} is bound more than once.`,
      });
      continue;
    }
    if (existing && existing.required !== field.required) {
      diagnostics.push({
        code: "FIELD_REQUIREDNESS_MISMATCH",
        fieldId: field.id,
        message:
          `Runtime input and connector bindings disagree about whether ${field.id} is required.`,
      });
    }
    if (!supportedConnectorFieldBinding(field)) {
      diagnostics.push({
        code: "UNSUPPORTED_CONNECTOR_FIELD_BINDING",
        fieldId: field.id,
        toolName: field.toolName,
        message:
          `Chat protocol does not yet support binding ${field.id} to ${field.toolName}.${field.argumentName}.`,
      });
    }
    runtimeBindings.set(field.id, {
      required: existing?.required ?? field.required,
      connector: field,
    });
  }

  for (const [fieldId, manifestField] of manifestFieldMap) {
    const runtimeField = runtimeBindings.get(fieldId);
    if (!runtimeField) {
      diagnostics.push({
        code: "MANIFEST_FIELD_UNBOUND",
        fieldId,
        message: `Manifest field ${fieldId} has no runtime or connector binding.`,
      });
      continue;
    }
    if (runtimeField.required !== manifestField.required) {
      diagnostics.push({
        code: "FIELD_REQUIREDNESS_MISMATCH",
        fieldId,
        message:
          `Manifest field ${fieldId} required=${manifestField.required} but runtime chat binding required=${runtimeField.required}.`,
      });
    }
  }

  for (const [fieldId] of runtimeBindings) {
    if (!manifestFieldMap.has(fieldId)) {
      diagnostics.push({
        code: "RUNTIME_FIELD_NOT_IN_MANIFEST",
        fieldId,
        message: `Runtime chat field ${fieldId} is not declared in the workflow manifest.`,
      });
    }
  }

  const manifestGateIds = new Set((input.manifest.gates ?? []).map((gate) => gate.id));
  const enforcedGateIds = new Set(contract.enforcedGateIds);
  for (const gate of input.manifest.gates ?? []) {
    if (gate.required && !enforcedGateIds.has(gate.id)) {
      diagnostics.push({
        code: "REQUIRED_GATE_NOT_ENFORCED",
        gateId: gate.id,
        message: `Required manifest gate ${gate.id} is not declared as runtime-enforced.`,
      });
    }
  }
  for (const gateId of enforcedGateIds) {
    if (!manifestGateIds.has(gateId)) {
      diagnostics.push({
        code: "UNKNOWN_ENFORCED_GATE",
        gateId,
        message: `Runtime chat contract declares unknown gate ${gateId}.`,
      });
    }
  }

  const requiredTools = requiredConnectorToolsForWorkflow(input.manifest, contract);
  for (const toolName of requiredTools) {
    if (!availableTools.has(toolName)) {
      diagnostics.push({
        code: "CONNECTOR_TOOL_MISSING",
        toolName,
        message: `Required connector tool ${toolName} is not available.`,
      });
    }
  }

  return Object.freeze({
    schemaVersion: WORKFLOW_CHAT_READINESS_VERSION,
    workflowId: input.manifest.id,
    certified: diagnostics.length === 0,
    requiredTools,
    diagnostics: Object.freeze(diagnostics),
  });
}
