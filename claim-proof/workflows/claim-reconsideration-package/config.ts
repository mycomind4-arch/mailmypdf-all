import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "claim-reconsideration-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/claim-reconsideration-package",
  startPath: "/claim-proof/workflows/claim-reconsideration-package/start",
  title: "Claim Reconsideration Package",
  seoTitle: "Claim Reconsideration Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Claim Reconsideration Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Claim Reconsideration Package",
  heroDescription: "Use a guided claim reconsideration package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
