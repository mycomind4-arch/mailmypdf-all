import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "inspection-notice-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/inspection-notice-response",
  startPath: "/code-enforcement/workflows/inspection-notice-response/start",
  title: "Inspection Notice Response",
  seoTitle: "Inspection Notice Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Inspection Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Inspection Notice Response",
  heroDescription: "Use a guided inspection notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
