import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "rfe-cover-letter",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/rfe-cover-letter",
  startPath: "/immigration-mail/workflows/rfe-cover-letter/start",
  title: "RFE Cover Letter",
  seoTitle: "RFE Cover Letter | Immigration Mail | MailMyPDF",
  seoDescription: "Use the RFE Cover Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "RFE Cover Letter",
  heroDescription: "Use a guided rfe cover letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
