import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog-only placeholder; not a certified workflow or live start route. */
export const workflowConfig = {
  id: "probate-beneficiary-update",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/probate-beneficiary-update",
  startPath: "/private-office/workflows/probate-beneficiary-update/start",
  title: "Probate Beneficiary Update",
  seoTitle: "Probate Beneficiary Update | Private Office | MailMyPDF",
  seoDescription: "Catalog entry for Probate Beneficiary Update. This workflow is not yet available for execution or mailing.",
  eyebrow: "Private Office workflow",
  heroTitle: "Probate Beneficiary Update",
  heroDescription: "Catalog-only workflow. Review source records, facts, documents, and required approvals before any future workflow launch.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
