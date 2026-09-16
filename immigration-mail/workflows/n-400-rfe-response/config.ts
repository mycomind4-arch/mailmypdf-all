import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "n-400-rfe-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/n-400-rfe-response",
  startPath: "/immigration-mail/workflows/n-400-rfe-response/start",
  title: "N-400 RFE Response",
  seoTitle: "N-400 RFE Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the N-400 RFE Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "N-400 RFE Response",
  heroDescription: "Use a guided n-400 rfe response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
