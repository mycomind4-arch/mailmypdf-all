import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog-only placeholder; not a certified workflow or live start route. */
export const workflowConfig = {
  id: "probate-estate-administration",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/probate-estate-administration",
  startPath: "/private-office/workflows/probate-estate-administration/start",
  title: "Probate Estate Administration",
  seoTitle: "Probate Estate Administration | Private Office | MailMyPDF",
  seoDescription: "Catalog entry for Probate Estate Administration. This workflow is not yet available for execution or mailing.",
  eyebrow: "Private Office workflow",
  heroTitle: "Probate Estate Administration",
  heroDescription: "Catalog-only workflow. Review source records, facts, documents, and required approvals before any future workflow launch.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
