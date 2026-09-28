import type { WorkflowFieldManifest } from "./workflow-fields.js";
import type {
  WorkflowDocumentRequirement,
  WorkflowManifest,
} from "./workflow-manifest.js";
import type {
  WorkflowMatterDocument,
  WorkflowMatterRecord,
} from "./matter-runtime-client.js";
import type { WorkflowRuntimeChatContract } from "./workflow-chat-contract.js";

export const WORKFLOW_PROTOCOL_VERSION = "mailmypdf.workflow/v1" as const;

export type WorkflowProtocolActionKind =
  | "document_upload"
  | "document_status"
  | "analysis"
  | "structured_input"
  | "draft_generation"
  | "draft_review"
  | "packet_preview"
  | "checkout"
  | "tracking"
  | "complete";

export type WorkflowProtocolAction = Readonly<{
  id: string;
  kind: WorkflowProtocolActionKind;
  toolName: string | null;
  title: string;
  prompt: string;
  requiresUserInput: boolean;
  requiresExplicitConsent: boolean;
  idempotencyRequired: boolean;
  consequential: boolean;
  arguments: Readonly<Record<string, unknown>>;
  fields?: readonly WorkflowFieldManifest[];
}>;

export type WorkflowProtocolDefinition = Readonly<{
  workflowId: string;
  title: string;
  primaryDocument: WorkflowDocumentRequirement | null;
  primaryDocumentRequired: boolean;
  packetRecipientField: WorkflowFieldManifest | null;
  analysisRequired: boolean;
  inputRequired: boolean;
  inputFields: readonly WorkflowFieldManifest[];
  requiresDraft: boolean;
  requiresMailing: boolean;
}>;

export type WorkflowProtocolState = Readonly<{
  schemaVersion: typeof WORKFLOW_PROTOCOL_VERSION;
  matterId: string;
  workflowId: string;
  sectionId: string;
  matterStatus: string;
  progress: Readonly<{
    sourceDocumentReady: boolean;
    analysisReady: boolean;
    inputReady: boolean;
    draftReady: boolean;
    approvalReady: boolean;
    orderReady: boolean;
  }>;
  blockers: readonly string[];
  nextActions: readonly WorkflowProtocolAction[];
}>;

function flattenFields(manifest: WorkflowManifest): readonly WorkflowFieldManifest[] {
  const seen = new Set<string>();
  const fields: WorkflowFieldManifest[] = [];
  for (const step of manifest.steps ?? []) {
    for (const field of step.fields ?? []) {
      if (seen.has(field.id)) continue;
      seen.add(field.id);
      fields.push(field);
    }
  }
  return fields;
}

/**
 * Converts the canonical workflow manifest into the small contract an LLM needs
 * to collect facts and advance a matter. It intentionally contains no user
 * values and no provider-specific state.
 */
export function workflowProtocolDefinitionFromManifest(
  manifest: WorkflowManifest,
  runtimeContract?: WorkflowRuntimeChatContract,
): WorkflowProtocolDefinition {
  const primaryDocument =
    manifest.documents?.find((document) => document.role === "primary") ?? null;
  const allFields = flattenFields(manifest);
  const inputIds = runtimeContract
    ? new Set(runtimeContract.inputFields.map((field) => field.id))
    : null;
  const inputFields = inputIds
    ? allFields.filter((field) => inputIds.has(field.id))
    : allFields;
  const recipientBinding = runtimeContract?.connectorFields?.find(
    (binding) =>
      binding.toolName === "preview_packet" &&
      binding.argumentName === "recipient",
  );
  const packetRecipientField = recipientBinding
    ? allFields.find((field) => field.id === recipientBinding.id) ?? null
    : null;
  const requiredOutputs = new Set(
    (manifest.outputs ?? [])
      .filter((output) => output.required)
      .map((output) => output.kind),
  );

  return Object.freeze({
    workflowId: manifest.id,
    title: manifest.title,
    primaryDocument,
    primaryDocumentRequired: primaryDocument?.required ?? false,
    packetRecipientField,
    analysisRequired: manifest.primaryInput === "document",
    inputRequired: inputFields.some((field) => field.required),
    inputFields: Object.freeze([...inputFields]),
    requiresDraft:
      requiredOutputs.size === 0 ||
      requiredOutputs.has("draft") ||
      requiredOutputs.has("pdf") ||
      requiredOutputs.has("packet"),
    requiresMailing:
      manifest.allowsConsequentialAction ||
      requiredOutputs.has("tracking") ||
      requiredOutputs.has("proof"),
  });
}

function action(
  value: WorkflowProtocolAction,
): WorkflowProtocolAction {
  return Object.freeze({
    ...value,
    arguments: Object.freeze({ ...value.arguments }),
    ...(value.fields ? { fields: Object.freeze([...value.fields]) } : {}),
  });
}

/** Generation is transient: the user must review the text before it is saved. */
export function generatedDraftReviewAction(matterId: string): WorkflowProtocolAction {
  return action({
    id: "review-and-save-draft",
    kind: "draft_review",
    toolName: "save_draft",
    title: "Review and save the draft",
    prompt:
      "Show the generated draft to the user. Accept edits and confirm the exact final text before calling save_draft with body_text. Then call get_workflow_state. Generating a draft does not save it or authorize mailing.",
    requiresUserInput: true,
    requiresExplicitConsent: false,
    idempotencyRequired: true,
    consequential: false,
    arguments: { matter_id: matterId },
  });
}

function sourceDocument(
  documents: readonly WorkflowMatterDocument[],
): WorkflowMatterDocument | null {
  return documents.find((document) => document.role === "subject_notice") ?? null;
}

function sourceIsReady(document: WorkflowMatterDocument | null): boolean {
  return Boolean(document?.usable && document.securityStatus === "clean");
}

/**
 * Deterministic, side-effect-free state reducer for chat/connector clients.
 * The runtime remains authoritative; an LLM may describe these actions but
 * must not invent later steps or bypass a missing prerequisite.
 */
export function deriveWorkflowProtocolState(input: {
  matter: WorkflowMatterRecord;
  documents: readonly WorkflowMatterDocument[];
  definition: WorkflowProtocolDefinition;
  analysisPresent: boolean;
  inputPresent: boolean;
  draftPresent: boolean;
  approvalPresent: boolean;
  orderPresent: boolean;
}): WorkflowProtocolState {
  const source = sourceDocument(input.documents);
  const sourceReady = sourceIsReady(source);
  const analysisReady = input.analysisPresent || !input.definition.analysisRequired;
  const inputReady = input.inputPresent || !input.definition.inputRequired;
  const draftReady = input.draftPresent || !input.definition.requiresDraft;
  const blockers: string[] = [];
  let nextActions: WorkflowProtocolAction[] = [];

  if (input.definition.primaryDocumentRequired && input.definition.primaryDocument && !source) {
    nextActions = [
      action({
        id: "upload-primary-document",
        kind: "document_upload",
        toolName: "ingest_document",
        title: `Upload ${input.definition.primaryDocument.label}`,
        prompt:
          `Ask the user to attach ${input.definition.primaryDocument.label}. Process it only after explicit consent.`,
        requiresUserInput: true,
        requiresExplicitConsent: true,
        idempotencyRequired: true,
        consequential: false,
        arguments: {
          matter_id: input.matter.id,
          role: "subject_notice",
          processing_consent: true,
        },
      }),
    ];
  } else if (source && !sourceReady) {
    blockers.push("The primary document has not cleared secure document scanning.");
    nextActions = [
      action({
        id: "check-primary-document",
        kind: "document_status",
        toolName: "get_document_status",
        title: "Check source document readiness",
        prompt:
          "Check the document security state. Do not analyze it until MailMyPDF reports it clean and usable.",
        requiresUserInput: false,
        requiresExplicitConsent: false,
        idempotencyRequired: false,
        consequential: false,
        arguments: {
          matter_id: input.matter.id,
          document_id: source.documentId,
        },
      }),
    ];
  } else if (input.definition.analysisRequired && !input.analysisPresent) {
    nextActions = [
      action({
        id: "analyze-matter",
        kind: "analysis",
        toolName: "analyze_matter",
        title: "Analyze the source document",
        prompt:
          "Run the registered workflow analysis. Treat extracted facts as unconfirmed until the workflow or user confirms them.",
        requiresUserInput: false,
        requiresExplicitConsent: false,
        idempotencyRequired: true,
        consequential: false,
        arguments: { matter_id: input.matter.id },
      }),
    ];
  } else if (!inputReady) {
    nextActions = [
      action({
        id: "collect-workflow-input",
        kind: "structured_input",
        toolName: "save_matter_input",
        title: "Collect verified workflow facts",
        prompt:
          "Collect the required fields from the user, distinguishing user-provided facts from extracted facts that require confirmation.",
        requiresUserInput: true,
        requiresExplicitConsent: false,
        idempotencyRequired: true,
        consequential: false,
        arguments: { matter_id: input.matter.id },
        fields: input.definition.inputFields,
      }),
    ];
  } else if (!draftReady) {
    nextActions = [
      action({
        id: "generate-draft",
        kind: "draft_generation",
        toolName: "generate_draft",
        title: "Generate a review draft",
        prompt:
          "Generate a proposed draft from verified facts. The result is transient; show it to the user and follow its review-and-save action before building a packet.",
        requiresUserInput: false,
        requiresExplicitConsent: false,
        idempotencyRequired: true,
        consequential: false,
        arguments: { matter_id: input.matter.id },
      }),
    ];
  } else if (!input.approvalPresent && input.definition.requiresMailing) {
    nextActions = [
      action({
        id: "preview-packet",
        kind: "packet_preview",
        toolName: "preview_packet",
        title: "Build the exact mailing preview",
        prompt:
          "Collect or confirm the recipient and mailing class, then build the immutable packet preview and quote for explicit user review.",
        requiresUserInput: true,
        requiresExplicitConsent: false,
        idempotencyRequired: true,
        consequential: false,
        arguments: { matter_id: input.matter.id },
        ...(input.definition.packetRecipientField
          ? { fields: [input.definition.packetRecipientField] }
          : {}),
      }),
    ];
  } else if (input.approvalPresent && input.definition.requiresMailing && !input.orderPresent) {
    nextActions = [
      action({
        id: "prepare-checkout",
        kind: "checkout",
        toolName: "prepare_checkout",
        title: "Prepare secure checkout",
        prompt:
          "Collect or confirm the sender address and prepare checkout for the already approved packet. Do not accept card data in chat.",
        requiresUserInput: true,
        requiresExplicitConsent: false,
        idempotencyRequired: true,
        consequential: true,
        arguments: { matter_id: input.matter.id },
      }),
    ];
  } else if (input.orderPresent && input.definition.requiresMailing) {
    nextActions = [
      action({
        id: "track-order",
        kind: "tracking",
        toolName: "get_order_status",
        title: "Track mailing and proof",
        prompt:
          "Read the owner-scoped order status, tracking events, and proof records. Do not infer delivery beyond recorded provider facts.",
        requiresUserInput: false,
        requiresExplicitConsent: false,
        idempotencyRequired: false,
        consequential: false,
        arguments: { matter_id: input.matter.id },
      }),
    ];
  } else {
    nextActions = [
      action({
        id: "complete",
        kind: "complete",
        toolName: null,
        title: "Workflow complete",
        prompt: "No further connector action is required for this workflow state.",
        requiresUserInput: false,
        requiresExplicitConsent: false,
        idempotencyRequired: false,
        consequential: false,
        arguments: {},
      }),
    ];
  }

  return Object.freeze({
    schemaVersion: WORKFLOW_PROTOCOL_VERSION,
    matterId: input.matter.id,
    workflowId: input.matter.workflowId,
    sectionId: input.matter.verticalId,
    matterStatus: input.matter.status,
    progress: Object.freeze({
      sourceDocumentReady:
        sourceReady ||
        !input.definition.primaryDocumentRequired,
      analysisReady,
      inputReady,
      draftReady,
      approvalReady: input.approvalPresent,
      orderReady: input.orderPresent,
    }),
    blockers: Object.freeze(blockers),
    nextActions: Object.freeze(nextActions),
  });
}
