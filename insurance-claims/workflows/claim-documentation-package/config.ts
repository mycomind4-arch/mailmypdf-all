import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "claim-documentation-package",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/claim-documentation-package",
  startPath: "/insurance-claims/workflows/claim-documentation-package/start",
  title: "Claim Documentation Package",
  seoTitle: "Claim Documentation Package | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Claim Documentation Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Claim Documentation Package",
  heroDescription: "Use a guided claim documentation package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
