import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "agency-records-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/agency-records-request",
  startPath: "/records-request/workflows/agency-records-request/start",
  title: "Agency Records Request",
  seoTitle: "Agency Records Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Agency Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Agency Records Request",
  heroDescription: "Use a guided agency records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
