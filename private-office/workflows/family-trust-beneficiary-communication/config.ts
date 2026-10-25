import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog-only placeholder; not a certified workflow or live start route. */
export const workflowConfig = {
  id: "family-trust-beneficiary-communication",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/family-trust-beneficiary-communication",
  startPath: "/private-office/workflows/family-trust-beneficiary-communication/start",
  title: "Family Trust Beneficiary Communication",
  seoTitle: "Family Trust Beneficiary Communication | Private Office | MailMyPDF",
  seoDescription: "Catalog entry for Family Trust Beneficiary Communication. This workflow is not yet available for execution or mailing.",
  eyebrow: "Private Office workflow",
  heroTitle: "Family Trust Beneficiary Communication",
  heroDescription: "Catalog-only workflow. Review source records, facts, documents, and required approvals before any future workflow launch.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
