import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-financial-aid-decision",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-financial-aid-decision",
  startPath: "/appeal-mail/workflows/appeal-financial-aid-decision/start",
  title: "Appeal Financial Aid Decision",
  seoTitle: "Appeal Financial Aid Decision | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Financial Aid Decision workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Financial Aid Decision",
  heroDescription: "Use a guided appeal financial aid decision workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
