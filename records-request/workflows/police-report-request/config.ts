import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "police-report-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/police-report-request",
  startPath: "/records-request/workflows/police-report-request/start",
  title: "Police Report Request",
  seoTitle: "Police Report Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Police Report Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Police Report Request",
  heroDescription: "Use a guided police report request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
