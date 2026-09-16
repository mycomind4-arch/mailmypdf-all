import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "insurance-claim-follow-up",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/insurance-claim-follow-up",
  startPath: "/insurance-claims/workflows/insurance-claim-follow-up/start",
  title: "Insurance Claim Follow Up",
  seoTitle: "Insurance Claim Follow Up | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Insurance Claim Follow Up workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Insurance Claim Follow Up",
  heroDescription: "Use a guided insurance claim follow up workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
