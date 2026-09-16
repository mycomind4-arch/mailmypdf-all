import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "correction-notice-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/correction-notice-response",
  startPath: "/code-enforcement/workflows/correction-notice-response/start",
  title: "Correction Notice Response",
  seoTitle: "Correction Notice Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Correction Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Correction Notice Response",
  heroDescription: "Use a guided correction notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
