import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "nuisance-violation-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/nuisance-violation-response",
  startPath: "/code-enforcement/workflows/nuisance-violation-response/start",
  title: "Nuisance Violation Response",
  seoTitle: "Nuisance Violation Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Nuisance Violation Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Nuisance Violation Response",
  heroDescription: "Use a guided nuisance violation response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
