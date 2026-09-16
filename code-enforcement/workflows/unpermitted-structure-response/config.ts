import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "unpermitted-structure-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/unpermitted-structure-response",
  startPath: "/code-enforcement/workflows/unpermitted-structure-response/start",
  title: "Unpermitted Structure Response",
  seoTitle: "Unpermitted Structure Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Unpermitted Structure Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Unpermitted Structure Response",
  heroDescription: "Use a guided unpermitted structure response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
