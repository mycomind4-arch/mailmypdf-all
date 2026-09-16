import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "claim-appeal-evidence-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/claim-appeal-evidence-package",
  startPath: "/claim-proof/workflows/claim-appeal-evidence-package/start",
  title: "Claim Appeal Evidence Package",
  seoTitle: "Claim Appeal Evidence Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Claim Appeal Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Claim Appeal Evidence Package",
  heroDescription: "Use a guided claim appeal evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
