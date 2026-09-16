import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "code-enforcement-records-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/code-enforcement-records-request",
  startPath: "/records-request/workflows/code-enforcement-records-request/start",
  title: "Code Enforcement Records Request",
  seoTitle: "Code Enforcement Records Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Code Enforcement Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Code Enforcement Records Request",
  heroDescription: "Use a guided code enforcement records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
