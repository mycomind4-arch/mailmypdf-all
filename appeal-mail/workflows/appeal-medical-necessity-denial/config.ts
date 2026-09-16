import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-medical-necessity-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-medical-necessity-denial",
  startPath: "/appeal-mail/workflows/appeal-medical-necessity-denial/start",
  title: "Appeal Medical Necessity Denial",
  seoTitle: "Appeal Medical Necessity Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Medical Necessity Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Medical Necessity Denial",
  heroDescription: "Use a guided appeal medical necessity denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
