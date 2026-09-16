import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "hospital-indemnity-claim-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/hospital-indemnity-claim-package",
  startPath: "/claim-proof/workflows/hospital-indemnity-claim-package/start",
  title: "Hospital Indemnity Claim Package",
  seoTitle: "Hospital Indemnity Claim Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Hospital Indemnity Claim Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Hospital Indemnity Claim Package",
  heroDescription: "Use a guided hospital indemnity claim package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
