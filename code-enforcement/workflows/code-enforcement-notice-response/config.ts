import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "code-enforcement-notice-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/code-enforcement-notice-response",
  startPath: "/code-enforcement/workflows/code-enforcement-notice-response/start",
  title: "Code Enforcement Notice Response",
  seoTitle: "Code Enforcement Notice Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Code Enforcement Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Code Enforcement Notice Response",
  heroDescription: "Use a guided code enforcement notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
