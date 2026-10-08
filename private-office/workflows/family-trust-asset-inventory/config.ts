import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog-only placeholder; not a certified workflow or live start route. */
export const workflowConfig = {
  id: "family-trust-asset-inventory",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/family-trust-asset-inventory",
  startPath: "/private-office/workflows/family-trust-asset-inventory/start",
  title: "Family Trust Asset Inventory",
  seoTitle: "Family Trust Asset Inventory | Private Office | MailMyPDF",
  seoDescription: "Catalog entry for Family Trust Asset Inventory. This workflow is not yet available for execution or mailing.",
  eyebrow: "Private Office workflow",
  heroTitle: "Family Trust Asset Inventory",
  heroDescription: "Catalog-only workflow. Review source records, facts, documents, and required approvals before any future workflow launch.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
