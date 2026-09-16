import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "health-insurance-claim-package",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/health-insurance-claim-package",
  startPath: "/claim-proof/workflows/health-insurance-claim-package/start",
  title: "Health Insurance Claim Package",
  seoTitle: "Health Insurance Claim Package | Claim Proof | MailMyPDF",
  seoDescription: "Use the Health Insurance Claim Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Health Insurance Claim Package",
  heroDescription: "Use a guided health insurance claim package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
