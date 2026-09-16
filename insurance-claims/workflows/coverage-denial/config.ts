import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "coverage-denial",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/coverage-denial",
  startPath: "/insurance-claims/workflows/coverage-denial/start",
  title: "Coverage Denial",
  seoTitle: "Coverage Denial | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Coverage Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Coverage Denial",
  heroDescription: "Use a guided coverage denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
