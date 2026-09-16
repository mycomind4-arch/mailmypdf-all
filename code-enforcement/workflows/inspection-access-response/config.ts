import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "inspection-access-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/inspection-access-response",
  startPath: "/code-enforcement/workflows/inspection-access-response/start",
  title: "Inspection Access Response",
  seoTitle: "Inspection Access Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Inspection Access Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Inspection Access Response",
  heroDescription: "Use a guided inspection access response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
