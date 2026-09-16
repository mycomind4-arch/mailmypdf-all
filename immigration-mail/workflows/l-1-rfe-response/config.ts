import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "l-1-rfe-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/l-1-rfe-response",
  startPath: "/immigration-mail/workflows/l-1-rfe-response/start",
  title: "L-1 RFE Response",
  seoTitle: "L-1 RFE Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the L-1 RFE Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "L-1 RFE Response",
  heroDescription: "Use a guided l-1 rfe response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
