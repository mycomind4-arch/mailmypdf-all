import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-social-security-decision",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-social-security-decision",
  startPath: "/appeal-mail/workflows/appeal-social-security-decision/start",
  title: "Appeal Social Security Decision",
  seoTitle: "Appeal Social Security Decision | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Social Security Decision workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Social Security Decision",
  heroDescription: "Use a guided appeal social security decision workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
