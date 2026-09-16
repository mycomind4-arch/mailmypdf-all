import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "code-enforcement-evidence-submission",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/code-enforcement-evidence-submission",
  startPath: "/code-enforcement/workflows/code-enforcement-evidence-submission/start",
  title: "Code Enforcement Evidence Submission",
  seoTitle: "Code Enforcement Evidence Submission | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Code Enforcement Evidence Submission workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Code Enforcement Evidence Submission",
  heroDescription: "Use a guided code enforcement evidence submission workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
