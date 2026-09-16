import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "inspection-records-request",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/inspection-records-request",
  startPath: "/code-enforcement/workflows/inspection-records-request/start",
  title: "Inspection Records Request",
  seoTitle: "Inspection Records Request | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Inspection Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Inspection Records Request",
  heroDescription: "Use a guided inspection records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
