import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "employment-records-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/employment-records-request",
  startPath: "/records-request/workflows/employment-records-request/start",
  title: "Employment Records Request",
  seoTitle: "Employment Records Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Employment Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Employment Records Request",
  heroDescription: "Use a guided employment records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
