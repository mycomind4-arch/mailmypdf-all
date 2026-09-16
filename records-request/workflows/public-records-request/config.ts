import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "public-records-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/public-records-request",
  startPath: "/records-request/workflows/public-records-request/start",
  title: "Public Records Request",
  seoTitle: "Public Records Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Public Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Public Records Request",
  heroDescription: "Use a guided public records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
