import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog-only placeholder; not a certified workflow or live start route. */
export const workflowConfig = {
  id: "probate-executor-document-request",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/probate-executor-document-request",
  startPath: "/private-office/workflows/probate-executor-document-request/start",
  title: "Probate Executor Document Request",
  seoTitle: "Probate Executor Document Request | Private Office | MailMyPDF",
  seoDescription: "Catalog entry for Probate Executor Document Request. This workflow is not yet available for execution or mailing.",
  eyebrow: "Private Office workflow",
  heroTitle: "Probate Executor Document Request",
  heroDescription: "Catalog-only workflow. Review source records, facts, documents, and required approvals before any future workflow launch.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
