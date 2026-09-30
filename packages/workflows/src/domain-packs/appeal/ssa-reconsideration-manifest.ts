import {
  checkboxField,
  longTextField,
  personNameField,
  postalAddressField,
  textField,
} from "../../workflow-fields.js";
import { defineWorkflow, type DefinedWorkflow } from "../../define-workflow.js";
import type { WorkflowManifest } from "../../workflow-manifest.js";
import {
  getSsaReconsiderationWorkflowProfile,
  type SsaReconsiderationWorkflowProfile,
} from "./ssa-reconsideration-profiles.js";

export const SSA_RECONSIDERATION_REQUIRED_CAPABILITIES = [
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

function claimantFields(profile: SsaReconsiderationWorkflowProfile) {
  const shared = [
    personNameField({
      id: "claimantName",
      label: "Claimant name",
      required: true,
    }),
    postalAddressField({
      id: "claimantAddress",
      label: "Claimant mailing address",
      required: true,
      sensitive: true,
    }),
    {
      id: "phone",
      label: "Phone",
      type: "phone" as const,
      required: true,
      origin: "user" as const,
      sensitive: true,
      maxLength: 60,
    },
    personNameField({
      id: "representativeName",
      label: "Representative name",
    }),
    textField({
      id: "responseMode",
      label: "Appeal stage",
      required: true,
      maxLength: 64,
      hint: "This workflow only supports reconsideration.",
    }),
    checkboxField({
      id: "confirmedReconsideration",
      label: "I confirm this appeal is at the reconsideration stage.",
      required: true,
    }),
    longTextField({
      id: "reasonsForDisagreement",
      label: "Why do you disagree with the denial?",
      required: true,
      maxLength: 8_000,
    }),
    longTextField({
      id: "conditionChanges",
      label: "Changes in existing conditions",
      maxLength: 8_000,
    }),
    longTextField({
      id: "newConditions",
      label: "New conditions",
      maxLength: 8_000,
    }),
    longTextField({
      id: "treatmentChanges",
      label: "Treatment changes",
      maxLength: 8_000,
    }),
    longTextField({
      id: "medicationChanges",
      label: "Medication changes",
      maxLength: 8_000,
    }),
    longTextField({
      id: "dailyFunctionChanges",
      label: "Changes in daily functioning",
      maxLength: 8_000,
    }),
  ];

  const programSpecific =
    profile.program === "SSDI"
      ? [
          longTextField({
            id: "workChanges",
            label: "Work changes",
            maxLength: 8_000,
          }),
        ]
      : [
          longTextField({
            id: "incomeFacts",
            label: "Income facts",
            maxLength: 8_000,
          }),
          longTextField({
            id: "resourceFacts",
            label: "Resource facts",
            maxLength: 8_000,
          }),
          longTextField({
            id: "livingArrangementFacts",
            label: "Living arrangement facts",
            maxLength: 8_000,
          }),
          longTextField({
            id: "eligibilityFacts",
            label: "Other eligibility facts",
            maxLength: 8_000,
          }),
        ];

  return [
    ...shared,
    ...programSpecific,
    longTextField({
      id: "additionalFacts",
      label: "Additional facts",
      maxLength: 12_000,
    }),
    longTextField({
      id: "requestedOutcome",
      label: "Requested outcome",
      maxLength: 2_000,
    }),
  ];
}

export function createSsaReconsiderationManifest(
  profile: SsaReconsiderationWorkflowProfile,
): DefinedWorkflow<WorkflowManifest> {
  return defineWorkflow({
    id: profile.workflowId,
    vertical: "appeal-mail",
    title: profile.title,
    route: `/appeal-mail/workflows/${profile.workflowId}/start`,
    pipeline: "P03_APPEAL",
    adapters: ["government", "benefits", "healthcare"],
    requiredCapabilities: SSA_RECONSIDERATION_REQUIRED_CAPABILITIES,
    optionalCapabilities: [],
    notApplicableCapabilities: [],
    maturity: "executable",
    primaryInput: "document",
    requiresHumanReview: true,
    allowsConsequentialAction: true,
    version: 1,
    steps: [
      {
        id: "decision",
        title: "Decision notice",
        description: `Securely upload and process the actual ${profile.program} denial notice.`,
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
        description:
          "Confirm reconsideration stage, medical or non-medical decision basis, dates, stated reasons, and uncertainties from the source notice.",
        uses: [
          "deadlines",
          "findings",
          "contradictions",
          "discrepancies",
          "requirements",
          "evidence",
          "research",
          "risk",
        ],
        requires: ["source_notice_clean"],
        completeWhen: ["appeal_level_confirmed", "decision_basis_confirmed"],
      },
      {
        id: "claimant",
        title: "Claimant facts",
        description:
          "Capture user-supplied facts separately from facts extracted from the source notice.",
        uses: ["matterState", "facts"],
        requires: ["appeal_level_confirmed"],
        completeWhen: [
          "claimant_identity_complete",
          "disagreement_basis_complete",
          "reconsideration_confirmed",
        ],
        fields: claimantFields(profile),
      },
      {
        id: "evidence",
        title: "Supporting evidence",
        description:
          "Upload, scan, organize, and explicitly select evidence for the reconsideration packet.",
        uses: [
          "secureUpload",
          "documentStorage",
          "documentScanning",
          "evidence",
          "provenance",
        ],
        completeWhen: ["evidence_reviewed"],
      },
      {
        id: "draft",
        title: "Grounded draft",
        description:
          "Create a reconsideration response constrained to source-grounded and user-confirmed facts.",
        uses: ["strategy", "draft", "draftProvenance", "validation"],
        requires: ["claimant_identity_complete", "disagreement_basis_complete"],
        completeWhen: ["draft_validated", "no_unresolved_placeholders"],
      },
      {
        id: "forms",
        title: "Official SSA forms",
        description:
          "Require the correct official SSA form set for the confirmed reconsideration basis.",
        uses: ["evidence", "validation"],
        requires: ["decision_basis_confirmed"],
        completeWhen: ["required_ssa_forms_clean_and_included"],
      },
      {
        id: "review",
        title: "Packet review",
        description:
          "Build the exact mail-ready packet, calculate server-authoritative pricing, confirm the destination, and require explicit review.",
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
        fields: [
          postalAddressField({
            id: "recipientAddress",
            label: "SSA mailing destination",
            required: true,
            origin: "extracted_confirmation",
            hint:
              "Confirm this against the controlling denial notice or current verified SSA instructions.",
          }),
        ],
      },
      {
        id: "mail",
        title: "Payment, mailing, tracking, and proof",
        description:
          "Pay for and submit only the exact approved packet, then retain tracking and proof.",
        uses: [
          "payment",
          "mailing",
          "tracking",
          "notifications",
          "proofAudit",
          "archive",
        ],
        requires: ["exact_packet_approved"],
        completeWhen: ["mailing_submitted", "proof_recorded"],
      },
    ],
    documents: [
      {
        id: profile.primaryDocumentId,
        label: profile.primaryDocumentLabel,
        role: "primary",
        required: true,
        acceptedKinds: [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/tiff",
        ],
        extractionSchema: profile.extractionSchema,
      },
      {
        id: "supporting-evidence",
        label: "Supporting evidence",
        role: "evidence",
        required: false,
        acceptedKinds: [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/tiff",
        ],
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
      {
        id: "source-document-ready",
        kind: "document_ready",
        label: `Source ${profile.program} denial notice is clean and usable`,
        required: true,
      },
      {
        id: "facts-confirmed",
        kind: "fact_confirmation",
        label: "Claimant confirms material facts used in the reconsideration",
        required: true,
      },
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
    acceptanceScenarios: [
      {
        id: "medical-reconsideration",
        description: `Medical ${profile.program} denial with SSA-561, SSA-3441, and SSA-827.`,
        required: true,
      },
      {
        id: "nonmedical-reconsideration",
        description:
          "Non-medical reconsideration requiring SSA-561 without forcing medical forms.",
        required: true,
      },
      {
        id: "wrong-appeal-level",
        description: "Hearing or unknown appeal level must fail closed.",
        required: true,
      },
      {
        id: "quarantined-document",
        description:
          "Unscanned source or evidence documents must block downstream use.",
        required: true,
      },
      {
        id: "payment-mail-idempotency",
        description:
          "Repeated payment/provider events must not create duplicate mail.",
        required: true,
      },
    ],
  });
}

export function createSsaReconsiderationManifestForWorkflow(
  workflowId: string,
): DefinedWorkflow<WorkflowManifest> | null {
  const profile = getSsaReconsiderationWorkflowProfile(workflowId);
  return profile ? createSsaReconsiderationManifest(profile) : null;
}
