import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "eb-1-rfe-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/eb-1-rfe-response",
  startPath: "/immigration-mail/workflows/eb-1-rfe-response/start",
  title: "EB-1 RFE Response",
  seoTitle: "EB-1 RFE Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the EB-1 RFE Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "EB-1 RFE Response",
  heroDescription: "Use a guided eb-1 rfe response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
