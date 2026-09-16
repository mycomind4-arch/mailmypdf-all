import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "zoning-violation-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/zoning-violation-response",
  startPath: "/code-enforcement/workflows/zoning-violation-response/start",
  title: "Zoning Violation Response",
  seoTitle: "Zoning Violation Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Zoning Violation Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Zoning Violation Response",
  heroDescription: "Use a guided zoning violation response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
