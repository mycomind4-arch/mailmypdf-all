import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "disability-insurance-denial",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/disability-insurance-denial",
  startPath: "/insurance-claims/workflows/disability-insurance-denial/start",
  title: "Disability Insurance Denial",
  seoTitle: "Disability Insurance Denial | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Disability Insurance Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Disability Insurance Denial",
  heroDescription: "Use a guided disability insurance denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
