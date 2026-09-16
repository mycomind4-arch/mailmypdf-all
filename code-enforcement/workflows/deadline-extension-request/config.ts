import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "deadline-extension-request",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/deadline-extension-request",
  startPath: "/code-enforcement/workflows/deadline-extension-request/start",
  title: "Deadline Extension Request",
  seoTitle: "Deadline Extension Request | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Deadline Extension Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Deadline Extension Request",
  heroDescription: "Use a guided deadline extension request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
