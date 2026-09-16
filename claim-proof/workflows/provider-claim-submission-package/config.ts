import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "provider-claim-submission-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/provider-claim-submission-package",
  startPath: "/claim-proof/workflows/provider-claim-submission-package/start",
  title: "Provider Claim Submission Package",
  seoTitle: "Provider Claim Submission Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Provider Claim Submission Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Provider Claim Submission Package",
  heroDescription: "Use a guided provider claim submission package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
