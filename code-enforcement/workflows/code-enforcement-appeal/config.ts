import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "code-enforcement-appeal",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/code-enforcement-appeal",
  startPath: "/code-enforcement/workflows/code-enforcement-appeal/start",
  title: "Code Enforcement Appeal",
  seoTitle: "Code Enforcement Appeal | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Code Enforcement Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Code Enforcement Appeal",
  heroDescription: "Use a guided code enforcement appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
