import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog-only placeholder; not a certified workflow or live start route. */
export const workflowConfig = {
  id: "probate-creditor-notice",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/probate-creditor-notice",
  startPath: "/private-office/workflows/probate-creditor-notice/start",
  title: "Probate Creditor Notice",
  seoTitle: "Probate Creditor Notice | Private Office | MailMyPDF",
  seoDescription: "Catalog entry for Probate Creditor Notice. This workflow is not yet available for execution or mailing.",
  eyebrow: "Private Office workflow",
  heroTitle: "Probate Creditor Notice",
  heroDescription: "Catalog-only workflow. Review source records, facts, documents, and required approvals before any future workflow launch.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
