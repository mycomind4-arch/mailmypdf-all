import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "medical-insurance-denial",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/medical-insurance-denial",
  startPath: "/insurance-claims/workflows/medical-insurance-denial/start",
  title: "Medical Insurance Denial",
  seoTitle: "Medical Insurance Denial | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Medical Insurance Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Medical Insurance Denial",
  heroDescription: "Use a guided medical insurance denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
