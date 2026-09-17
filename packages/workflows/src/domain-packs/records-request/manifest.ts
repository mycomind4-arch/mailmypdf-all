import { defineWorkflow, type DefinedWorkflow } from "../../define-workflow.js";
import type { WorkflowManifest, WorkflowMaturity } from "../../workflow-manifest.js";

export const RECORDS_REQUEST_REQUIRED_CAPABILITIES = [
  "identity", "matterState", "security", "secureUpload", "documentStorage",
  "documentScanning", "retention", "classification", "extraction", "visionAnalysis",
  "aiExecution", "understand", "facts", "provenance", "timeline", "deadlines",
  "findings", "requirements", "evidence", "research", "strategy", "draft",
  "draftProvenance", "validation", "blockingGate", "humanReview", "approval",
  "pdfGeneration", "packetAssembly", "pricing", "payment", "addressVerification",
  "mailing", "tracking", "notifications", "proofAudit", "archive", "resilience",
  "observability", "acceptanceTesting",
] as const;

export interface RecordsRequestManifestOptions {
  workflowId: `${string}-records-request` | "public-records-request" | "foia-request" | "open-records-request";
  title: string;
  contextDocumentLabel?: string;
  supportingContextLabel?: string;
  route?: string;
  maturity?: WorkflowMaturity;
}

export function createRecordsRequestManifest(
  options: RecordsRequestManifestOptions,
): DefinedWorkflow<WorkflowManifest> {
  if (!options.workflowId.trim()) throw new Error("Records Request workflow id is required");
  if (!options.title.trim()) throw new Error("Records Request workflow title is required");

  const contextDocumentLabel = options.contextDocumentLabel ?? "Optional source or context document";
  const supportingContextLabel = options.supportingContextLabel ?? "Supporting context documents";

  return defineWorkflow({
    id: options.workflowId,
    vertical: "records-request",
    title: options.title,
    route: options.route ?? `/records-request/workflows/${options.workflowId}/start`,
    pipeline: "P08_RECORDS",
    adapters: ["government", "records"],
    requiredCapabilities: RECORDS_REQUEST_REQUIRED_CAPABILITIES,
    optionalCapabilities: [],
    notApplicableCapabilities: ["contradictions", "discrepancies", "risk"],
    maturity: options.maturity ?? "wired",
    primaryInput: "request",
    requiresHumanReview: true,
    allowsConsequentialAction: true,
    version: 1,
    steps: [
      {
        id: "scope",
        title: "Request scope",
        description: "Capture the requester, receiving agency, records sought, date range, references, format, and fee instructions without guessing missing details.",
        uses: ["matterState", "facts", "requirements"],
        completeWhen: ["requester_identified", "agency_identified", "records_scope_complete"],
      },
      {
        id: "context",
        title: "Context documents",
        description: "Optionally add notices, case correspondence, screenshots, or other records that help identify the agency, matter, dates, and records sought.",
        uses: ["secureUpload", "documentStorage", "documentScanning", "classification", "extraction", "visionAnalysis", "understand", "provenance", "evidence"],
        optional: true,
        completeWhen: ["included_context_documents_clean"],
      },
      {
        id: "authority",
        title: "Authority and response rules",
        description: "Use verified authority when available, preserve uncertainty when it is not, and calculate response tracking only from a confirmed actual send date.",
        uses: ["research", "deadlines", "findings", "requirements", "provenance"],
        requires: ["records_scope_complete"],
        completeWhen: ["authority_status_recorded", "recipient_rules_reviewed"],
      },
      {
        id: "draft",
        title: "Grounded request",
        description: "Draft a precise request using only user-confirmed facts, clean supporting context, and verified authority supplied to the workflow.",
        uses: ["strategy", "draft", "draftProvenance", "validation"],
        requires: ["requester_identified", "agency_identified", "records_scope_complete"],
        completeWhen: ["draft_validated", "no_unresolved_placeholders"],
      },
      {
        id: "review",
        title: "Exact packet review",
        description: "Build the exact request packet, verify the destination, calculate server-authoritative pricing, and require explicit review of the exact content to be sent.",
        uses: ["pdfGeneration", "packetAssembly", "pricing", "addressVerification", "blockingGate", "humanReview", "approval"],
        requires: ["draft_validated"],
        completeWhen: ["exact_packet_approved"],
      },
      {
        id: "send",
        title: "Payment and sending",
        description: "Pay for and send only the exact approved packet through the configured fulfillment adapter.",
        uses: ["payment", "mailing", "tracking", "notifications", "proofAudit", "archive"],
        requires: ["exact_packet_approved"],
        completeWhen: ["mailing_submitted", "actual_send_recorded", "proof_recorded"],
      },
      {
        id: "response",
        title: "Response tracking",
        description: "Track the agency response from the confirmed actual send date, preserve received materials, and never infer non-response automatically.",
        uses: ["timeline", "deadlines", "evidence", "notifications", "proofAudit", "archive"],
        requires: ["actual_send_recorded"],
        completeWhen: ["response_outcome_recorded"],
      },
    ],
    documents: [
      {
        id: "request-context",
        label: contextDocumentLabel,
        role: "primary",
        required: false,
        acceptedKinds: ["application/pdf", "image/png", "image/jpeg", "image/tiff"],
        extractionSchema: "agency-records-request-context-v1",
      },
      {
        id: "supporting-context",
        label: supportingContextLabel,
        role: "evidence",
        required: false,
        acceptedKinds: ["application/pdf", "image/png", "image/jpeg", "image/tiff"],
      },
    ],
    gates: [
      { id: "scope-confirmed", kind: "fact_confirmation", label: "Requester confirms the agency, records scope, references, and material request facts", required: true },
      { id: "authority-grounding", kind: "custom", label: "Any legal authority or timing statement included in the request is verified or explicitly omitted", beforeCapability: "draft", required: true },
      { id: "exact-packet-review", kind: "human_review", label: "User reviewed the exact request packet and destination", beforeCapability: "approval", required: true },
      { id: "mailing-authorization", kind: "mailing_authorization", label: "User authorizes sending the exact approved request packet", beforeCapability: "mailing", required: true },
    ],
    outputs: [
      { id: "records-request-draft", kind: "draft", required: true },
      { id: "records-request-pdf", kind: "pdf", required: true },
      { id: "request-packet", kind: "packet", required: true },
      { id: "payment-receipt", kind: "receipt", required: true },
      { id: "tracking", kind: "tracking", required: true },
      { id: "send-proof", kind: "proof", required: true },
      { id: "response-record", kind: "archive", required: true },
    ],
    acceptanceScenarios: [
      { id: "request-from-facts-only", description: "A user can prepare a request from entered facts without inventing or requiring a source document.", required: true },
      { id: "request-with-context-documents", description: "Clean optional context documents can support scoping without becoming instructions to the model.", required: true },
      { id: "authority-unknown", description: "Unknown or unverified authority is omitted rather than fabricated.", required: true },
      { id: "packet-change-invalidates-approval", description: "Changing request content or the packet after review requires a new approval.", required: true },
      { id: "actual-send-starts-tracking", description: "Response tracking starts from the confirmed actual send date, never draft, approval, checkout, or print time.", required: true },
      { id: "non-response-explicit", description: "A non-response outcome requires an explicit observation date and is never inferred automatically.", required: true },
      { id: "payment-mail-idempotency", description: "Repeated payment/provider events must not create duplicate mailings.", required: true },
    ],
  });
}
