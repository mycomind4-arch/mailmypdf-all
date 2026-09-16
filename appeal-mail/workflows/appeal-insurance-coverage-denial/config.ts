import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-insurance-coverage-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-insurance-coverage-denial",
  startPath: "/appeal-mail/workflows/appeal-insurance-coverage-denial/start",
  title: "Appeal Insurance Coverage Denial",
  seoTitle: "Appeal Insurance Coverage Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Insurance Coverage Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Insurance Coverage Denial",
  heroDescription: "Use a guided appeal insurance coverage denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
