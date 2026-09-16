import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "code-enforcement-records-request",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/code-enforcement-records-request",
  startPath: "/code-enforcement/workflows/code-enforcement-records-request/start",
  title: "Code Enforcement Records Request",
  seoTitle: "Code Enforcement Records Request | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Code Enforcement Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Code Enforcement Records Request",
  heroDescription: "Use a guided code enforcement records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
