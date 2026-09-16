import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "criminal-history-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/criminal-history-request",
  startPath: "/records-request/workflows/criminal-history-request/start",
  title: "Criminal History Request",
  seoTitle: "Criminal History Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Criminal History Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Criminal History Request",
  heroDescription: "Use a guided criminal history request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
