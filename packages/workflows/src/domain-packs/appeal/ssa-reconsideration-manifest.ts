import { defineWorkflow, type DefinedWorkflow } from "../../define-workflow.js";
import type { WorkflowManifest, WorkflowMaturity } from "../../workflow-manifest.js";
import type { WorkflowFieldManifest } from "../../workflow-fields.js";
import {
  SSA_RECONSIDERATION_WORKFLOWS,
  type SsaReconsiderationProgram,
  type SsaReconsiderationWorkflowId,
} from "./ssa-reconsideration-runtime-policy.js";

/**
 * Canonical manifest factory for the SSA reconsideration family (SSDI and SSI
 * denial appeals). SSDI and SSI share every step, document, gate, and output;
 * they differ only in title/document labels and the claimant-facts field set,
 * mirroring the split already enforced by
 * `createSsaReconsiderationRuntimePolicy()`.
 */

export interface SsaReconsiderationManifestOptions {
  maturity?: WorkflowMaturity;
  route?: string;
}

const VERTICAL_ID = "appeal-mail";

const REQUIRED_CAPABILITIES = [
  "identity",
  "matterState",
  "security",
  "secureUpload",
  "documentStorage",
  "documentScanning",
  "retention",
  "classification",
  "extraction",
  "visionAnalysis",
  "aiExecution",
  "understand",
  "facts",
  "provenance",
  "deadlines",
  "findings",
  "contradictions",
  "discrepancies",
  "requirements",
  "evidence",
  "research",
  "risk",
  "strategy",
  "draft",
  "draftProvenance",
  "validation",
  "blockingGate",
  "humanReview",
  "approval",
  "pdfGeneration",
  "packetAssembly",
  "pricing",
  "payment",
  "addressVerification",
  "mailing",
  "tracking",
  "notifications",
  "proofAudit",
  "archive",
  "resilience",
  "observability",
  "acceptanceTesting",
] as const;

const COMMON_CLAIMANT_FIELDS: readonly WorkflowFieldManifest[] = [
  { id: "claimant-name", label: "Claimant name", type: "person_name", required: true, origin: "user", maxLength: 200 },
  { id: "claimant-address", label: "Claimant address", type: "postal_address", required: true, origin: "user", sensitive: true },
  { id: "phone", label: "Phone", type: "phone", required: true, origin: "user", sensitive: true, maxLength: 60 },
  { id: "representative-name", label: "Representative name", type: "person_name", required: false, origin: "user", maxLength: 200 },
  { id: "reasons-for-disagreement", label: "Why do you disagree with the denial?", type: "textarea", required: true, origin: "user", maxLength: 8000 },
  {
    id: "confirmed-reconsideration",
    label: "I confirm I am requesting reconsideration of this denial.",
    type: "checkbox",
    required: true,
    origin: "user",
  },
  { id: "condition-changes", label: "Changes in existing conditions", type: "textarea", required: false, origin: "user", maxLength: 8000 },
  { id: "new-conditions", label: "New conditions", type: "textarea", required: false, origin: "user", maxLength: 8000 },
  { id: "treatment-changes", label: "Treatment changes", type: "textarea", required: false, origin: "user", maxLength: 8000 },
  { id: "medication-changes", label: "Medication changes", type: "textarea", required: false, origin: "user", maxLength: 8000 },
];

const PROGRAM_CLAIMANT_FIELDS: Record<SsaReconsiderationProgram, readonly WorkflowFieldManifest[]> = {
  SSDI: [
    ...COMMON_CLAIMANT_FIELDS,
    { id: "work-changes", label: "Work changes", type: "textarea", required: false, origin: "user", maxLength: 8000 },
    { id: "daily-function-changes", label: "Changes in daily functioning", type: "textarea", required: false, origin: "user", maxLength: 8000 },
    { id: "additional-facts", label: "Additional facts", type: "textarea", required: false, origin: "user", maxLength: 12000 },
  ],
  SSI: [
    ...COMMON_CLAIMANT_FIELDS,
    { id: "daily-function-changes", label: "Changes in daily functioning", type: "textarea", required: false, origin: "user", maxLength: 8000 },
    { id: "income-facts", label: "Income facts", type: "textarea", required: false, origin: "user", maxLength: 8000 },
    { id: "resource-facts", label: "Resource facts", type: "textarea", required: false, origin: "user", maxLength: 8000 },
    { id: "living-arrangement-facts", label: "Living arrangement facts", type: "textarea", required: false, origin: "user", maxLength: 8000 },
    { id: "eligibility-facts", label: "Other eligibility facts", type: "textarea", required: false, origin: "user", maxLength: 8000 },
    { id: "additional-facts", label: "Additional facts", type: "textarea", required: false, origin: "user", maxLength: 12000 },
  ],
};

const PROGRAM_LABELS: Record<
  SsaReconsiderationProgram,
  { title: string; noticeLabel: string; extractionSchema: string; analysisDescription: string }
> = {
  SSDI: {
    title: "Appeal SSDI Denial",
    noticeLabel: "SSDI denial notice",
    extractionSchema: "ssdi-denial-notice-v1",
    analysisDescription: "Confirm appeal level, decision basis, dates, stated reasons, and uncertainties from the source notice.",
  },
  SSI: {
    title: "Appeal SSI Denial",
    noticeLabel: "SSI denial notice",
    extractionSchema: "ssi-denial-notice-v1",
    analysisDescription: "Confirm appeal level, medical or non-medical decision basis, dates, stated reasons, and uncertainties from the source notice.",
  },
};

function acceptanceScenarios(program: SsaReconsiderationProgram) {
  return [
    { id: "medical-reconsideration", description: `Medical ${program} denial with SSA-561, SSA-3441, and SSA-827.`, required: true },
    { id: "nonmedical-reconsideration", description: `Non-medical ${program} denial requiring SSA-561 without forcing medical forms.`, required: true },
    { id: "wrong-appeal-level", description: "Hearing or unknown appeal level must fail closed.", required: true },
    { id: "quarantined-document", description: "Unscanned source/evidence documents must block downstream use.", required: true },
    { id: "payment-mail-idempotency", description: "Repeated payment/provider events must not create duplicate mail.", required: true },
  ];
}

export function createSsaReconsiderationManifestForWorkflow(
  workflowId: string,
  options: SsaReconsiderationManifestOptions = {},
): DefinedWorkflow<WorkflowManifest> | null {
  if (!Object.hasOwn(SSA_RECONSIDERATION_WORKFLOWS, workflowId)) return null;
  const program = SSA_RECONSIDERATION_WORKFLOWS[workflowId as SsaReconsiderationWorkflowId];
  const labels = PROGRAM_LABELS[program];
  const documentId = `${program.toLowerCase()}-denial-notice`;

  return defineWorkflow({
    id: workflowId,
    vertical: VERTICAL_ID,
    title: labels.title,
    route: options.route ?? `/appeal-mail/workflows/${workflowId}/start`,
    pipeline: "P03_APPEAL",
    adapters: ["government", "benefits", "healthcare"],
    requiredCapabilities: REQUIRED_CAPABILITIES,
    optionalCapabilities: [],
    notApplicableCapabilities: [],
    maturity: options.maturity ?? "executable",
    primaryInput: "document",
    requiresHumanReview: true,
    allowsConsequentialAction: true,
    version: 1,
    steps: [
      {
        id: "decision",
        title: "Decision notice",
        description: `Securely upload and process the actual ${program} denial notice.`,
        uses: [
          "secureUpload",
          "documentStorage",
          "documentScanning",
          "classification",
          "extraction",
          "visionAnalysis",
          "understand",
          "provenance",
        ],
        completeWhen: ["source_notice_clean", "source_notice_understood"],
      },
      {
        id: "analysis",
        title: "Decision analysis",
        description: labels.analysisDescription,
        uses: ["deadlines", "findings", "contradictions", "discrepancies", "requirements", "evidence", "research", "risk"],
        requires: ["source_notice_clean"],
        completeWhen: ["appeal_level_confirmed", "decision_basis_confirmed"],
      },
      {
        id: "claimant",
        title: "Claimant facts",
        description: "Capture user-supplied facts separately from extracted notice facts.",
        uses: ["matterState", "facts"],
        requires: ["appeal_level_confirmed"],
        completeWhen: ["claimant_identity_complete", "disagreement_basis_complete"],
        fields: PROGRAM_CLAIMANT_FIELDS[program],
      },
      {
        id: "evidence",
        title: "Supporting evidence",
        description: "Upload, scan, organize, and explicitly select evidence for the packet.",
        uses: ["secureUpload", "documentStorage", "documentScanning", "evidence", "provenance"],
        completeWhen: ["evidence_reviewed"],
      },
      {
        id: "draft",
        title: "Grounded draft",
        description: "Create a reconsideration response constrained to source-grounded and user-confirmed facts.",
        uses: ["strategy", "draft", "draftProvenance", "validation"],
        requires: ["claimant_identity_complete", "disagreement_basis_complete"],
        completeWhen: ["draft_validated", "no_unresolved_placeholders"],
      },
      {
        id: "forms",
        title: "Official SSA forms",
        description: "Require the correct official SSA form set for the confirmed reconsideration type.",
        uses: ["evidence", "validation"],
        requires: ["decision_basis_confirmed"],
        completeWhen: ["required_ssa_forms_clean_and_included"],
      },
      {
        id: "review",
        title: "Packet review",
        description: "Build the exact mail-ready packet, calculate server-authoritative pricing, and require explicit review.",
        uses: [
          "pdfGeneration",
          "packetAssembly",
          "pricing",
          "addressVerification",
          "blockingGate",
          "humanReview",
          "approval",
        ],
        requires: ["draft_validated", "required_ssa_forms_clean_and_included"],
        completeWhen: ["exact_packet_approved"],
      },
      {
        id: "mail",
        title: "Payment, mailing, tracking, and proof",
        description: "Pay for and submit only the exact approved packet, then retain tracking and proof.",
        uses: ["payment", "mailing", "tracking", "notifications", "proofAudit", "archive"],
        requires: ["exact_packet_approved"],
        completeWhen: ["mailing_submitted", "proof_recorded"],
      },
    ],
    documents: [
      {
        id: documentId,
        label: labels.noticeLabel,
        role: "primary",
        required: true,
        acceptedKinds: ["application/pdf", "image/png", "image/jpeg", "image/tiff"],
        extractionSchema: labels.extractionSchema,
      },
      {
        id: "supporting-evidence",
        label: "Supporting evidence",
        role: "evidence",
        required: false,
        acceptedKinds: ["application/pdf", "image/png", "image/jpeg", "image/tiff"],
      },
      {
        id: "ssa-561",
        label: "SSA-561-U2 Request for Reconsideration",
        role: "supporting",
        required: true,
        acceptedKinds: ["application/pdf"],
      },
      {
        id: "ssa-3441",
        label: "SSA-3441 Disability Report — Appeal",
        role: "supporting",
        required: false,
        acceptedKinds: ["application/pdf"],
      },
      {
        id: "ssa-827",
        label: "SSA-827 Authorization to Disclose Information",
        role: "supporting",
        required: false,
        acceptedKinds: ["application/pdf"],
      },
    ],
    gates: [
      { id: "source-document-ready", kind: "document_ready", label: "Source denial notice is clean and usable", required: true },
      { id: "facts-confirmed", kind: "fact_confirmation", label: "Claimant confirms material facts used in the response", required: true },
      {
        id: "exact-packet-review",
        kind: "human_review",
        label: "User reviewed the exact packet and mailing destination",
        beforeCapability: "approval",
        required: true,
      },
      {
        id: "mailing-authorization",
        kind: "mailing_authorization",
        label: "User authorizes mailing of the approved packet",
        beforeCapability: "mailing",
        required: true,
      },
    ],
    outputs: [
      { id: "response-draft", kind: "draft", required: true },
      { id: "response-pdf", kind: "pdf", required: true },
      { id: "mail-packet", kind: "packet", required: true },
      { id: "payment-receipt", kind: "receipt", required: true },
      { id: "tracking", kind: "tracking", required: true },
      { id: "mailing-proof", kind: "proof", required: true },
      { id: "matter-archive", kind: "archive", required: true },
    ],
    acceptanceScenarios: acceptanceScenarios(program),
  });
}
