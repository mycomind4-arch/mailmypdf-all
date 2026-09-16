import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "code-enforcement-case-file-package",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/code-enforcement-case-file-package",
  startPath: "/code-enforcement/workflows/code-enforcement-case-file-package/start",
  title: "Code Enforcement Case File Package",
  seoTitle: "Code Enforcement Case File Package | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Code Enforcement Case File Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Code Enforcement Case File Package",
  heroDescription: "Use a guided code enforcement case file package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
