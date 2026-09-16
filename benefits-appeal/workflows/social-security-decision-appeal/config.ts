import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "social-security-decision-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/social-security-decision-appeal",
  startPath: "/benefits-appeal/workflows/social-security-decision-appeal/start",
  title: "Social Security Decision Appeal",
  seoTitle: "Social Security Decision Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Social Security Decision Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Social Security Decision Appeal",
  heroDescription: "Use a guided social security decision appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
