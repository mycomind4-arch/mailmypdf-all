import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-social-security-overpayment",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-social-security-overpayment",
  startPath: "/appeal-mail/workflows/appeal-social-security-overpayment/start",
  title: "Appeal Social Security Overpayment",
  seoTitle: "Appeal Social Security Overpayment | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Social Security Overpayment workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Social Security Overpayment",
  heroDescription: "Use a guided appeal social security overpayment workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
