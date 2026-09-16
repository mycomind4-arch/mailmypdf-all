import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "building-code-violation-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/building-code-violation-response",
  startPath: "/code-enforcement/workflows/building-code-violation-response/start",
  title: "Building Code Violation Response",
  seoTitle: "Building Code Violation Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Building Code Violation Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Building Code Violation Response",
  heroDescription: "Use a guided building code violation response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
