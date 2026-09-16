import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "social-security-non-medical-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/social-security-non-medical-appeal",
  startPath: "/benefits-appeal/workflows/social-security-non-medical-appeal/start",
  title: "Social Security Non Medical Appeal",
  seoTitle: "Social Security Non Medical Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Social Security Non Medical Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Social Security Non Medical Appeal",
  heroDescription: "Use a guided social security non medical appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
