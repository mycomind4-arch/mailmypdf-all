import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "h-1b-rfe-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/h-1b-rfe-response",
  startPath: "/immigration-mail/workflows/h-1b-rfe-response/start",
  title: "H-1B RFE Response",
  seoTitle: "H-1B RFE Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the H-1B RFE Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "H-1B RFE Response",
  heroDescription: "Use a guided h-1b rfe response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
