import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "criminal-records-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/criminal-records-request",
  startPath: "/records-request/workflows/criminal-records-request/start",
  title: "Criminal Records Request",
  seoTitle: "Criminal Records Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Criminal Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Criminal Records Request",
  heroDescription: "Use a guided criminal records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
