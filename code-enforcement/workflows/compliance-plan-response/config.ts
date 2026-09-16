import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "compliance-plan-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/compliance-plan-response",
  startPath: "/code-enforcement/workflows/compliance-plan-response/start",
  title: "Compliance Plan Response",
  seoTitle: "Compliance Plan Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Compliance Plan Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Compliance Plan Response",
  heroDescription: "Use a guided compliance plan response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
