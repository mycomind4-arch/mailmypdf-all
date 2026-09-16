import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "niw-rfe-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/niw-rfe-response",
  startPath: "/immigration-mail/workflows/niw-rfe-response/start",
  title: "NIW RFE Response",
  seoTitle: "NIW RFE Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the NIW RFE Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "NIW RFE Response",
  heroDescription: "Use a guided niw rfe response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
