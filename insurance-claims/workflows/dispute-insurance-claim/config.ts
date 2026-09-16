import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dispute-insurance-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/dispute-insurance-claim",
  startPath: "/insurance-claims/workflows/dispute-insurance-claim/start",
  title: "Dispute Insurance Claim",
  seoTitle: "Dispute Insurance Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Dispute Insurance Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Dispute Insurance Claim",
  heroDescription: "Use a guided dispute insurance claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
