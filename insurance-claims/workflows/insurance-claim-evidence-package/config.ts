import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "insurance-claim-evidence-package",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/insurance-claim-evidence-package",
  startPath: "/insurance-claims/workflows/insurance-claim-evidence-package/start",
  title: "Insurance Claim Evidence Package",
  seoTitle: "Insurance Claim Evidence Package | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Insurance Claim Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Insurance Claim Evidence Package",
  heroDescription: "Use a guided insurance claim evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
