import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "claim-proof-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/claim-proof-package",
  startPath: "/claim-proof/workflows/claim-proof-package/start",
  title: "Claim Proof Package",
  seoTitle: "Claim Proof Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Claim Proof Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Claim Proof Package",
  heroDescription: "Use a guided claim proof package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
