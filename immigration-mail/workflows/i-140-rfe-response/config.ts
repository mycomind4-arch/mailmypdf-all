import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "i-140-rfe-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/i-140-rfe-response",
  startPath: "/immigration-mail/workflows/i-140-rfe-response/start",
  title: "I-140 RFE Response",
  seoTitle: "I-140 RFE Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the I-140 RFE Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "I-140 RFE Response",
  heroDescription: "Use a guided i-140 rfe response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
