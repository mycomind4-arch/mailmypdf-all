import type { AdapterId } from "../../adapter-registry.js";
import {
  checkboxField,
  longTextField,
  personNameField,
  postalAddressField,
  referenceNumberField,
  textField,
} from "../../workflow-fields.js";
import { defineWorkflow, type DefinedWorkflow } from "../../define-workflow.js";
import type {
  WorkflowManifest,
  WorkflowMaturity,
} from "../../workflow-manifest.js";

export const INSURANCE_APPEAL_REQUIRED_CAPABILITIES = [
  "identity", "matterState", "security", "secureUpload", "documentStorage",
  "documentScanning", "retention", "classification", "extraction", "visionAnalysis",
  "aiExecution", "understand", "facts", "provenance", "deadlines", "findings",
  "contradictions", "discrepancies", "requirements", "evidence", "research", "risk",
  "strategy", "draft", "draftProvenance", "validation", "blockingGate", "humanReview",
  "approval", "pdfGeneration", "packetAssembly", "pricing", "payment", "addressVerification",
  "mailing", "tracking", "notifications", "proofAudit", "archive", "resilience",
  "observability", "acceptanceTesting",
] as const;

export interface InsuranceAppealManifestOptions {
  workflowId: `appeal-${string}`;
  title: string;
  primaryDocumentId: string;
  primaryDocumentLabel: string;
  extractionSchema: string;
  supportingEvidenceLabel?: string;
  adapters?: readonly AdapterId[];
  maturity?: WorkflowMaturity;
  route?: string;
}

export interface InsuranceAppealManifestProfile
  extends Omit<InsuranceAppealManifestOptions, "maturity" | "route"> {}

export const INSURANCE_APPEAL_MANIFEST_PROFILES: readonly InsuranceAppealManifestProfile[] = Object.freeze([
  {
    workflowId: "appeal-denied-claim",
    title: "Appeal Denied Claim",
    primaryDocumentId: "claim-denial-letter",
    primaryDocumentLabel: "Claim denial letter",
    extractionSchema: "claim-denial-letter-v1",
    adapters: ["insurance", "government", "benefits"],
  },
  {
    workflowId: "appeal-insurance-claim-denial",
    title: "Appeal an Insurance Claim Denial",
    primaryDocumentId: "insurance-claim-denial",
    primaryDocumentLabel: "Insurance claim denial letter",
    extractionSchema: "claim-denial-letter-v1",
  },
  {
    workflowId: "appeal-medical-insurance-denial",
    title: "Appeal a Medical Insurance Denial",
    primaryDocumentId: "medical-insurance-denial",
    primaryDocumentLabel: "Medical insurance denial letter",
    extractionSchema: "claim-denial-letter-v1",
  },
  {
    workflowId: "appeal-prior-authorization-denial",
    title: "Appeal a Prior Authorization Denial",
    primaryDocumentId: "prior-authorization-denial",
    primaryDocumentLabel: "Prior authorization denial letter",
    extractionSchema: "claim-denial-letter-v1",
  },
  {
    workflowId: "appeal-insurance-coverage-denial",
    title: "Appeal an Insurance Coverage Denial",
    primaryDocumentId: "insurance-coverage-denial",
    primaryDocumentLabel: "Insurance coverage denial letter",
    extractionSchema: "claim-denial-letter-v1",
  },
  {
    workflowId: "appeal-medical-necessity-denial",
    title: "Appeal a Medical Necessity Denial",
    primaryDocumentId: "medical-necessity-denial",
    primaryDocumentLabel: "Medical necessity denial letter",
    extractionSchema: "claim-denial-letter-v1",
  },
  {
    workflowId: "appeal-out-of-network-denial",
    title: "Appeal an Out-of-Network Denial",
    primaryDocumentId: "out-of-network-denial",
    primaryDocumentLabel: "Out-of-network denial letter",
    extractionSchema: "claim-denial-letter-v1",
  },
  {
    workflowId: "appeal-dental-insurance-denial",
    title: "Dental Insurance Appeal",
    primaryDocumentId: "dental-insurance-denial",
    primaryDocumentLabel: "Dental insurance denial letter",
    extractionSchema: "claim-denial-letter-v1",
  },
  {
    workflowId: "appeal-life-insurance-denial",
    title: "Life Insurance Denial Appeal",
    primaryDocumentId: "life-insurance-denial",
    primaryDocumentLabel: "Life insurance denial letter",
    extractionSchema: "claim-denial-letter-v1",
  },
  {
    workflowId: "appeal-car-insurance-claim",
    title: "Appeal a Car Insurance Claim",
    primaryDocumentId: "car-insurance-claim-decision",
    primaryDocumentLabel: "Car insurance claim decision",
    extractionSchema: "claim-denial-letter-v1",
  },
  {
    workflowId: "appeal-timely-filing-denial",
    title: "Appeal a Timely Filing Denial",
    primaryDocumentId: "timely-filing-denial",
    primaryDocumentLabel: "Timely filing denial letter",
    extractionSchema: "claim-denial-letter-v1",
  },
]);

export function insuranceAppealManifestProfile(
  workflowId: string,
): InsuranceAppealManifestProfile | null {
  return INSURANCE_APPEAL_MANIFEST_PROFILES.find(
    (profile) => profile.workflowId === workflowId,
  ) ?? null;
}

export function createInsuranceAppealManifestForWorkflow(
  workflowId: string,
  options: Pick<InsuranceAppealManifestOptions, "maturity" | "route"> = {},
): DefinedWorkflow<WorkflowManifest> | null {
  const profile = insuranceAppealManifestProfile(workflowId);
  if (!profile) return null;
  return createInsuranceAppealManifest({
    ...profile,
    ...options,
  });
}

/**
 * Build the canonical seven-step insurance appeal contract.
 *
 * The factory intentionally defaults to `wired`, not `executable`. A workflow
 * may be promoted to executable only when its concrete start route, runtime,
 * acceptance coverage, and provider boundaries are actually present.
 */
export function createInsuranceAppealManifest(
  options: InsuranceAppealManifestOptions,
): DefinedWorkflow<WorkflowManifest> {
  if (!options.workflowId.startsWith("appeal-")) {
    throw new Error(`Insurance appeal workflow id must use canonical appeal identity: ${options.workflowId}`);
  }
  if (!options.title.trim()) throw new Error("Insurance appeal workflow requires a title");
  if (!options.primaryDocumentId.trim() || !options.primaryDocumentLabel.trim()) {
    throw new Error("Insurance appeal workflow requires primary document identity and label");
  }
  if (!options.extractionSchema.trim()) {
    throw new Error("Insurance appeal workflow requires a registered extraction schema id");
  }

  const route = options.route ?? `/appeal-mail/workflows/${options.workflowId}/start`;
  const evidenceLabel = options.supportingEvidenceLabel ?? "Supporting evidence";
  const maturity = options.maturity ?? "wired";

  return defineWorkflow({
    id: options.workflowId,
    vertical: "appeal-mail",
    title: options.title,
    route,
    pipeline: "P03_APPEAL",
    adapters: options.adapters ?? ["insurance"],
    requiredCapabilities: INSURANCE_APPEAL_REQUIRED_CAPABILITIES,
    optionalCapabilities: [],
    notApplicableCapabilities: [],
    maturity,
    primaryInput: "document",
    requiresHumanReview: true,
    allowsConsequentialAction: true,
    version: 1,
    steps: [
      {
        id: "decision",
        title: options.primaryDocumentLabel,
        description: `Securely upload and process the actual ${options.primaryDocumentLabel.toLowerCase()}.`,
        uses: ["secureUpload", "documentStorage", "documentScanning", "classification", "extraction", "visionAnalysis", "understand", "provenance"],
        completeWhen: ["source_notice_clean", "source_notice_understood"],
      },
      {
        id: "analysis",
        title: "Denial analysis",
        description: "Identify the issuer, denial reason, important dates, deadline, appeal instructions, response destination, contradictions, and unresolved requirements.",
        uses: ["deadlines", "findings", "contradictions", "discrepancies", "requirements", "research", "risk"],
        requires: ["source_notice_clean"],
        completeWhen: ["denial_analyzed"],
      },
      {
        id: "facts",
        title: "Appeal facts",
        description: "Capture user-confirmed facts separately from extracted source-document facts.",
        uses: ["matterState", "facts"],
        requires: ["denial_analyzed"],
        completeWhen: ["appeal_facts_confirmed"],
        fields: [
          personNameField({
            id: "claimantName",
            label: "Claimant name",
            required: true,
          }),
          postalAddressField({
            id: "claimantAddress",
            label: "Claimant mailing address",
            required: true,
          }),
          {
            id: "phone",
            label: "Phone",
            type: "phone",
            required: false,
            origin: "user",
            maxLength: 100,
          },
          referenceNumberField({
            id: "claimNumber",
            label: "Claim or reference number",
            origin: "extracted_confirmation",
          }),
          textField({
            id: "organizationName",
            label: "Insurer or organization name",
            origin: "extracted_confirmation",
            maxLength: 300,
          }),
          longTextField({
            id: "reasonsForDisagreement",
            label: "Reasons for disagreement",
            required: true,
            maxLength: 12_000,
          }),
          longTextField({
            id: "requestedOutcome",
            label: "Requested outcome",
            required: true,
            maxLength: 4_000,
          }),
          longTextField({
            id: "additionalFacts",
            label: "Additional confirmed facts",
            maxLength: 12_000,
          }),
          checkboxField({
            id: "factsConfirmed",
            label: "I reviewed and confirm the material facts used in this appeal.",
            required: true,
            origin: "user",
          }),
        ],
      },
      {
        id: "evidence",
        title: evidenceLabel,
        description: "Upload, scan, organize, and explicitly select evidence for the appeal packet.",
        uses: ["secureUpload", "documentStorage", "documentScanning", "evidence", "provenance"],
        completeWhen: ["evidence_reviewed"],
        fields: [
          checkboxField({
            id: "evidenceReviewComplete",
            label: "I reviewed the supporting-evidence set that will be used for this appeal.",
            required: true,
            origin: "user",
          }),
        ],
      },
      {
        id: "draft",
        title: "Grounded appeal draft",
        description: "Create an appeal constrained to source-grounded and user-confirmed facts.",
        uses: ["strategy", "draft", "draftProvenance", "validation"],
        requires: ["appeal_facts_confirmed"],
        completeWhen: ["draft_validated", "no_unresolved_placeholders"],
      },
      {
        id: "review",
        title: "Packet review",
        description: "Build the exact mail-ready packet, calculate server-authoritative pricing, verify the mailing destination, and require explicit review.",
        uses: ["pdfGeneration", "packetAssembly", "pricing", "addressVerification", "blockingGate", "humanReview", "approval"],
        requires: ["draft_validated"],
        completeWhen: ["exact_packet_approved"],
        fields: [
          postalAddressField({
            id: "recipientAddress",
            label: "Appeal mailing destination",
            required: true,
            origin: "extracted_confirmation",
            hint: "Confirm this against the destination in the controlling denial notice or current verified instructions.",
          }),
        ],
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
        id: options.primaryDocumentId,
        label: options.primaryDocumentLabel,
        role: "primary",
        required: true,
        acceptedKinds: ["application/pdf", "image/png", "image/jpeg", "image/tiff"],
        extractionSchema: options.extractionSchema,
      },
      {
        id: "supporting-evidence",
        label: evidenceLabel,
        role: "evidence",
        required: false,
        acceptedKinds: ["application/pdf", "image/png", "image/jpeg", "image/tiff"],
      },
    ],
    gates: [
      { id: "source-document-ready", kind: "document_ready", label: `Source ${options.primaryDocumentLabel.toLowerCase()} is clean and usable`, required: true },
      { id: "facts-confirmed", kind: "fact_confirmation", label: "User confirms material facts used in the appeal", required: true },
      { id: "exact-packet-review", kind: "human_review", label: "User reviewed the exact packet and mailing destination", beforeCapability: "approval", required: true },
      { id: "mailing-authorization", kind: "mailing_authorization", label: "User authorizes mailing of the approved packet", beforeCapability: "mailing", required: true },
    ],
    outputs: [
      { id: "appeal-draft", kind: "draft", required: true },
      { id: "appeal-pdf", kind: "pdf", required: true },
      { id: "mail-packet", kind: "packet", required: true },
      { id: "payment-receipt", kind: "receipt", required: true },
      { id: "tracking", kind: "tracking", required: true },
      { id: "mailing-proof", kind: "proof", required: true },
      { id: "matter-archive", kind: "archive", required: true },
    ],
    acceptanceScenarios: [
      {
        id: options.workflowId === "appeal-denied-claim"
          ? "standard-denied-claim"
          : "standard-insurance-appeal",
        description: "Decision document, user facts, evidence, grounded draft, exact packet, payment, mailing, and proof.",
        required: true,
      },
      { id: "quarantined-document", description: "Unscanned source or evidence blocks downstream use.", required: true },
      { id: "packet-tamper", description: "A packet changed after approval must fail closed.", required: true },
      { id: "payment-mail-idempotency", description: "Repeated payment/provider events must not create duplicate mail.", required: true },
    ],
  });
}
