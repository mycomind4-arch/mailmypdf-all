import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "notice-of-violation-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/notice-of-violation-response",
  startPath: "/code-enforcement/workflows/notice-of-violation-response/start",
  title: "Notice Of Violation Response",
  seoTitle: "Notice Of Violation Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Notice Of Violation Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Notice Of Violation Response",
  heroDescription: "Use a guided notice of violation response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
