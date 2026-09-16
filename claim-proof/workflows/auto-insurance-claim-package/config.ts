import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "auto-insurance-claim-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/auto-insurance-claim-package",
  startPath: "/claim-proof/workflows/auto-insurance-claim-package/start",
  title: "Auto Insurance Claim Package",
  seoTitle: "Auto Insurance Claim Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Auto Insurance Claim Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Auto Insurance Claim Package",
  heroDescription: "Use a guided auto insurance claim package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
