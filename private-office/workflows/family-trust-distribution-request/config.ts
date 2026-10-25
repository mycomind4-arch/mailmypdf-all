import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog-only placeholder; not a certified workflow or live start route. */
export const workflowConfig = {
  id: "family-trust-distribution-request",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/family-trust-distribution-request",
  startPath: "/private-office/workflows/family-trust-distribution-request/start",
  title: "Family Trust Distribution Request",
  seoTitle: "Family Trust Distribution Request | Private Office | MailMyPDF",
  seoDescription: "Catalog entry for Family Trust Distribution Request. This workflow is not yet available for execution or mailing.",
  eyebrow: "Private Office workflow",
  heroTitle: "Family Trust Distribution Request",
  heroDescription: "Catalog-only workflow. Review source records, facts, documents, and required approvals before any future workflow launch.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
