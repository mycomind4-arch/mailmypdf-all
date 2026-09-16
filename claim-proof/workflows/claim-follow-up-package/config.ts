import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "claim-follow-up-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/claim-follow-up-package",
  startPath: "/claim-proof/workflows/claim-follow-up-package/start",
  title: "Claim Follow Up Package",
  seoTitle: "Claim Follow Up Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Claim Follow Up Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Claim Follow Up Package",
  heroDescription: "Use a guided claim follow up package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
