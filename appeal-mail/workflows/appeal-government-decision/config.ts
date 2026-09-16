import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-government-decision",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-government-decision",
  startPath: "/appeal-mail/workflows/appeal-government-decision/start",
  title: "Appeal Government Decision",
  seoTitle: "Appeal Government Decision | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Government Decision workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Government Decision",
  heroDescription: "Use a guided appeal government decision workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
