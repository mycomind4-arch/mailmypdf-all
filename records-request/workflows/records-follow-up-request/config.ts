import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "records-follow-up-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/records-follow-up-request",
  startPath: "/records-request/workflows/records-follow-up-request/start",
  title: "Records Follow Up Request",
  seoTitle: "Records Follow Up Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Records Follow Up Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Records Follow Up Request",
  heroDescription: "Use a guided records follow up request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
