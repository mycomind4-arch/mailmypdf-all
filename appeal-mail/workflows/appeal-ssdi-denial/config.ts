import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-ssdi-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-ssdi-denial",
  startPath: "/appeal-mail/workflows/appeal-ssdi-denial/start",
  title: "Appeal SSDI Denial",
  seoTitle: "Appeal SSDI Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal SSDI Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal SSDI Denial",
  heroDescription: "Use a guided appeal ssdi denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
