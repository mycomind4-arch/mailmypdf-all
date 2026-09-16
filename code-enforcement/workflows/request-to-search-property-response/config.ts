import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "request-to-search-property-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/request-to-search-property-response",
  startPath: "/code-enforcement/workflows/request-to-search-property-response/start",
  title: "Request To Search Property Response",
  seoTitle: "Request To Search Property Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Request To Search Property Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Request To Search Property Response",
  heroDescription: "Use a guided request to search property response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
