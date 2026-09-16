import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "document-request-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/document-request-response",
  startPath: "/notice-respond/workflows/document-request-response/start",
  title: "Document Request Response",
  seoTitle: "Document Request Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Document Request Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Document Request Response",
  heroDescription: "Use a guided document request response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
