import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "land-use-violation-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/land-use-violation-response",
  startPath: "/code-enforcement/workflows/land-use-violation-response/start",
  title: "Land Use Violation Response",
  seoTitle: "Land Use Violation Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Land Use Violation Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Land Use Violation Response",
  heroDescription: "Use a guided land use violation response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
