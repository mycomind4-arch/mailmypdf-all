import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "rfe-response-letter",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/rfe-response-letter",
  startPath: "/immigration-mail/workflows/rfe-response-letter/start",
  title: "RFE Response Letter",
  seoTitle: "RFE Response Letter | Immigration Mail | MailMyPDF",
  seoDescription: "Use the RFE Response Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "RFE Response Letter",
  heroDescription: "Use a guided rfe response letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
