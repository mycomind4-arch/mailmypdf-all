import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "government-documents-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/government-documents-request",
  startPath: "/records-request/workflows/government-documents-request/start",
  title: "Government Documents Request",
  seoTitle: "Government Documents Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Government Documents Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Government Documents Request",
  heroDescription: "Use a guided government documents request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
