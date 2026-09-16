import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "insurance-claim-appeal",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/insurance-claim-appeal",
  startPath: "/insurance-claims/workflows/insurance-claim-appeal/start",
  title: "Insurance Claim Appeal",
  seoTitle: "Insurance Claim Appeal | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Insurance Claim Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Insurance Claim Appeal",
  heroDescription: "Use a guided insurance claim appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
