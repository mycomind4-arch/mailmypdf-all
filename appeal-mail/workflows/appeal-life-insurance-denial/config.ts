import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-life-insurance-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-life-insurance-denial",
  startPath: "/appeal-mail/workflows/appeal-life-insurance-denial/start",
  title: "Appeal Life Insurance Denial",
  seoTitle: "Appeal Life Insurance Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Life Insurance Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Life Insurance Denial",
  heroDescription: "Use a guided appeal life insurance denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
