import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog scaffold only: no executable runtime or verified legal guidance. */
export const workflowConfig = {
  id: "family-trust-asset-inventory",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/family-trust-asset-inventory",
  startPath: "/private-office/workflows/family-trust-asset-inventory/start",
  title: "Family Trust Asset Inventory",
  seoTitle: "Family Trust Asset Inventory | Private Office | MailMyPDF",
  seoDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for family trust asset inventory. Verify requirements and obtain appropriate review before acting.",
  eyebrow: "Private Office workflow",
  heroTitle: "Family Trust Asset Inventory",
  heroDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for family trust asset inventory. Verify requirements and obtain appropriate review before acting.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
