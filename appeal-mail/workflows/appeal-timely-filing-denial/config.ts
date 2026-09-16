import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-timely-filing-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-timely-filing-denial",
  startPath: "/appeal-mail/workflows/appeal-timely-filing-denial/start",
  title: "Appeal Timely Filing Denial",
  seoTitle: "Appeal Timely Filing Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Timely Filing Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Timely Filing Denial",
  heroDescription: "Use a guided appeal timely filing denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
