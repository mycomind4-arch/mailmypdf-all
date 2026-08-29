import type { PipelineStage } from "./gold-standard-pipeline.js";
import type { PipelineId } from "./pipeline-registry.js";
import { configuredPipelineStages } from "./configured-pipeline.js";

export type ReferencePipelineProfile = {
  id: PipelineId;
  name: string;
  enabledSpecialistStages: readonly PipelineStage[];
  representativeWorkflows: readonly string[];
};

export const REFERENCE_PIPELINE_PROFILES: Readonly<Record<PipelineId, ReferencePipelineProfile>> = {
  P01_CORE_MAIL: {
    id: "P01_CORE_MAIL",
    name: "Core Mail Reference",
    enabledSpecialistStages: ["classification", "evidence"],
    representativeWorkflows: ["mail-a-pdf", "write-a-letter"],
  },
  P02_OFFICIAL_RESPONSE: {
    id: "P02_OFFICIAL_RESPONSE",
    name: "Official Response Reference",
    enabledSpecialistStages: ["contradiction", "discrepancy", "research", "risk", "approval"],
    representativeWorkflows: ["irs-notice", "cp2000-response", "agency-action"],
  },
  P03_APPEAL: {
    id: "P03_APPEAL",
    name: "Appeal Reference",
    enabledSpecialistStages: ["contradiction", "research", "approval"],
    representativeWorkflows: ["denied-claim", "insurance-claim-denial", "ssdi-denial"],
  },
  P04_COURT: {
    id: "P04_COURT",
    name: "Court Reference",
    enabledSpecialistStages: ["contradiction", "discrepancy"],
    representativeWorkflows: ["court-summons", "court-ruling"],
  },
  P05_IMMIGRATION: {
    id: "P05_IMMIGRATION",
    name: "Immigration Reference",
    enabledSpecialistStages: ["research", "contradiction", "discrepancy", "approval"],
    representativeWorkflows: ["respond-to-notice", "supporting-documents", "explanation-letter"],
  },
  P06_DISPUTE: {
    id: "P06_DISPUTE",
    name: "Dispute Reference",
    enabledSpecialistStages: ["findings", "research", "approval"],
    representativeWorkflows: ["debt-validation", "credit-report", "billing-error"],
  },
  P07_BUSINESS_AUTOMATION: {
    id: "P07_BUSINESS_AUTOMATION",
    name: "Business Automation Reference",
    enabledSpecialistStages: ["classification", "extraction", "deadline", "evidence", "review", "approval"],
    representativeWorkflows: ["payment-reminder", "payment-demand", "customer-dispute-response"],
  },
  P08_RECORDS: {
    id: "P08_RECORDS",
    name: "Records Reference",
    enabledSpecialistStages: ["contradiction", "discrepancy", "risk", "approval"],
    representativeWorkflows: ["records-request"],
  },
  P09_REGULATORY: {
    id: "P09_REGULATORY",
    name: "Regulatory Reference",
    enabledSpecialistStages: ["contradiction", "discrepancy", "approval"],
    representativeWorkflows: ["permit-reply", "tenant-reply", "license-suspension-appeal"],
  },
  P10_CLAIM_PROOF: {
    id: "P10_CLAIM_PROOF",
    name: "Claim / Proof Reference",
    enabledSpecialistStages: ["deadline", "contradiction", "discrepancy", "research", "approval"],
    representativeWorkflows: ["claim-proof", "benefits-documentation"],
  },
};

export function referenceStages(id: PipelineId): readonly PipelineStage[] {
  const profile = REFERENCE_PIPELINE_PROFILES[id];
  return configuredPipelineStages(id, profile.enabledSpecialistStages);
}
