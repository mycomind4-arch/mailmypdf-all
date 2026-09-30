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
  type SsaReconsiderationProfileWorkflowId,
} from "./ssa-reconsideration-profiles.js";

export const SSA_RECONSIDERATION_REQUIRED_CAPABILITIES = [
  "identity", "matterState", "security", "secureUpload", "documentStorage",
  "documentScanning", "retention", "classification", "extraction", "visionAnalysis",
  "aiExecution", "understand", "facts", "provenance", "deadlines", "findings",
  "contradictions", "discrepancies", "requirements", "evidence", "research", "risk",
  "strategy", "draft", "draftProvenance", "validation", "blockingGate", "humanReview",
  "approval", "pdfGeneration", "packetAssembly", "pricing", "payment",
  "addressVerification", "mailing", "tracking", "notifications", "proofAudit",
  "archive", "resilience", "observability", "acceptanceTesting",
] as const;

function commonClaimantFields() {
  return [
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
      label: "Appeal response mode",
      required: true,
      maxLength: 100,
    }),
    checkboxField({
      id: "confirmedReconsideration",
      label: "I confirm this workflow is for reconsideration.",
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
}

export function createSsaReconsiderationManifest(
  workflowId: SsaReconsiderationProfileWorkflowId,
): DefinedWorkflow<WorkflowManifest> {
  const profile = getSsaReconsiderationWorkflowProfile(workflowId);
  if (!profile) {
    throw new Error(`Unknown SSA reconsideration workflow: ${workflowId}`);
  }

  const programSpecificFields =
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
    version: 2,
    steps: [
      {
        id: "decision",
        title: "Decision notice",
        description: `Securely upload and process the actual ${profile.primaryDocumentLabel}.`,
        uses: [
          "secureUpload", "documentStorage", "documentScanning", "classification",
          "extraction", "visionAnalysis", "understand", "provenance",
        ],
        completeWhen: ["source_notice_clean", "source_notice_understood"],
      },
      {
        id: "analysis",
        title: "Decision analysis",
        description:
          "Confirm reconsideration level, decision basis, dates, stated reasons, and unresolved requirements from the source notice.",
        uses: [
          "deadlines", "findings", "contradictions", "discrepancies",
          "requirements", "evidence", "research", "risk",
        ],
        requires: ["source_notice_clean"],
        completeWhen: ["appeal_level_confirmed", "decision_basis_confirmed"],
      },
      {
        id: "claimant",
        title: "Claimant facts",
        description:
          "Capture user-confirmed facts separately from facts extracted from the SSA decision.",
        uses: ["matterState", "facts"],
        requires: ["appeal_level_confirmed"],
        completeWhen: ["claimant_facts_confirmed"],
        fields: [
          ...commonClaimantFields(),
          ...programSpecificFields,
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
          checkboxField({
            id: "factsConfirmed",
            label:
              "I reviewed and confirm the material claimant facts used in this reconsideration.",
            required: true,
          }),
        ],
      },
      {
        id: "evidence",
        title: "Supporting evidence",
        description:
          "Upload, scan, organize, and explicitly select evidence for the reconsideration packet.",
        uses: [
          "secureUpload", "documentStorage", "documentScanning", "evidence",
          "provenance",
        ],
        completeWhen: ["included_evidence_clean"],
      },
      {
        id: "draft",
        title: "Grounded reconsideration draft",
        description:
          "Create a response constrained to the SSA decision, confirmed claimant facts, and included evidence.",
        uses: ["strategy", "draft", "draftProvenance", "validation"],
        requires: ["claimant_facts_confirmed"],
        completeWhen: ["draft_validated", "no_unresolved_placeholders"],
      },
      {
        id: "forms",
        title: "Official SSA forms",
        description:
          "Require the official SSA form set appropriate to the decision basis confirmed from the notice.",
        uses: ["evidence", "validation"],
        requires: ["decision_basis_confirmed"],
        completeWhen: ["required_ssa_forms_clean_and_included"],
      },
      {
        id: "review",
        title: "Exact packet review",
        description:
          "Build the exact packet, verify its destination, calculate server-authoritative pricing, and require explicit approval.",
        uses: [
          "pdfGeneration", "packetAssembly", "pricing", "addressVerification",
          "blockingGate", "humanReview", "approval",
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
              "Confirm this against the controlling SSA notice or current official instructions.",
          }),
        ],
      },
      {
        id: "mail",
        title: "Payment, mailing, tracking, and proof",
        description:
          "Pay for and submit only the exact approved packet, then retain tracking and proof.",
        uses: ["payment", "mailing", "tracking", "notifications", "proofAudit", "archive"],
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
        acceptedKinds: ["application/pdf", "image/png", "image/jpeg", "image/tiff"],
        extractionSchema: profile.extractionSchema,
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
      {
        id: "source-document-ready",
        kind: "document_ready",
        label: "Source SSA decision is clean and usable",
        required: true,
      },
      {
        id: "facts-confirmed",
        kind: "fact_confirmation",
        label: "Claimant confirms the material facts used in the reconsideration",
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
        description:
          "Medical reconsideration requires SSA-561, SSA-3441, and SSA-827.",
        required: true,
      },
      {
        id: "nonmedical-reconsideration",
        description:
          "Non-medical reconsideration requires SSA-561 without forcing medical forms.",
        required: true,
      },
      {
        id: "wrong-appeal-level",
        description:
          "A hearing or unknown appeal level must fail closed.",
        required: true,
      },
      {
        id: "quarantined-document",
        description:
          "Unclean source or included evidence blocks downstream use.",
        required: true,
      },
      {
        id: "payment-mail-idempotency",
        description:
          "Repeated payment/provider events must not create duplicate mailings.",
        required: true,
      },
    ],
  });
}

export function createSsaReconsiderationManifestForWorkflow(
  workflowId: string,
): DefinedWorkflow<WorkflowManifest> | null {
  const profile = getSsaReconsiderationWorkflowProfile(workflowId);
  return profile
    ? createSsaReconsiderationManifest(
        profile.workflowId as SsaReconsiderationProfileWorkflowId,
      )
    : null;
}
