import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "complaint-records-request",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/complaint-records-request",
  startPath: "/code-enforcement/workflows/complaint-records-request/start",
  title: "Complaint Records Request",
  seoTitle: "Complaint Records Request | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Complaint Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Complaint Records Request",
  heroDescription: "Use a guided complaint records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
