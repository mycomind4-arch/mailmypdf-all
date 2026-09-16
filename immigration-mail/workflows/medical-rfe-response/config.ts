import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "medical-rfe-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/medical-rfe-response",
  startPath: "/immigration-mail/workflows/medical-rfe-response/start",
  title: "Medical RFE Response",
  seoTitle: "Medical RFE Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Medical RFE Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Medical RFE Response",
  heroDescription: "Use a guided medical rfe response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
