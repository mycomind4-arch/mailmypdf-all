import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog scaffold only: no executable runtime or verified legal guidance. */
export const workflowConfig = {
  id: "probate-executor-document-request",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/probate-executor-document-request",
  startPath: "/private-office/workflows/probate-executor-document-request/start",
  title: "Probate Executor Document Request",
  seoTitle: "Probate Executor Document Request | Private Office | MailMyPDF",
  seoDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for probate executor document request. Verify requirements and obtain appropriate review before acting.",
  eyebrow: "Private Office workflow",
  heroTitle: "Probate Executor Document Request",
  heroDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for probate executor document request. Verify requirements and obtain appropriate review before acting.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
