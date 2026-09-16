import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "administrative-hearing-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/administrative-hearing-response",
  startPath: "/code-enforcement/workflows/administrative-hearing-response/start",
  title: "Administrative Hearing Response",
  seoTitle: "Administrative Hearing Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Administrative Hearing Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Administrative Hearing Response",
  heroDescription: "Use a guided administrative hearing response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
