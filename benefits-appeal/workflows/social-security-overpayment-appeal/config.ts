import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "social-security-overpayment-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/social-security-overpayment-appeal",
  startPath: "/benefits-appeal/workflows/social-security-overpayment-appeal/start",
  title: "Social Security Overpayment Appeal",
  seoTitle: "Social Security Overpayment Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Social Security Overpayment Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Social Security Overpayment Appeal",
  heroDescription: "Use a guided social security overpayment appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
