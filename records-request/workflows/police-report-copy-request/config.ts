import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "police-report-copy-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/police-report-copy-request",
  startPath: "/records-request/workflows/police-report-copy-request/start",
  title: "Police Report Copy Request",
  seoTitle: "Police Report Copy Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Police Report Copy Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Police Report Copy Request",
  heroDescription: "Use a guided police report copy request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
