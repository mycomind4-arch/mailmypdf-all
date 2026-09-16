import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-prior-authorization-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-prior-authorization-denial",
  startPath: "/appeal-mail/workflows/appeal-prior-authorization-denial/start",
  title: "Appeal Prior Authorization Denial",
  seoTitle: "Appeal Prior Authorization Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Prior Authorization Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Prior Authorization Denial",
  heroDescription: "Use a guided appeal prior authorization denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
