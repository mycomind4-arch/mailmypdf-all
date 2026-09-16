import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "inspection-warrant-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/inspection-warrant-response",
  startPath: "/code-enforcement/workflows/inspection-warrant-response/start",
  title: "Inspection Warrant Response",
  seoTitle: "Inspection Warrant Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Inspection Warrant Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Inspection Warrant Response",
  heroDescription: "Use a guided inspection warrant response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
