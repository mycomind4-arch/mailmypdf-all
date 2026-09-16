import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-medical-insurance-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-medical-insurance-denial",
  startPath: "/appeal-mail/workflows/appeal-medical-insurance-denial/start",
  title: "Appeal Medical Insurance Denial",
  seoTitle: "Appeal Medical Insurance Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Medical Insurance Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Medical Insurance Denial",
  heroDescription: "Use a guided appeal medical insurance denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
