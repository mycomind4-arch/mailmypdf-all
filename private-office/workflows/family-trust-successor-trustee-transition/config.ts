import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog-only placeholder; not a certified workflow or live start route. */
export const workflowConfig = {
  id: "family-trust-successor-trustee-transition",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/family-trust-successor-trustee-transition",
  startPath: "/private-office/workflows/family-trust-successor-trustee-transition/start",
  title: "Family Trust Successor Trustee Transition",
  seoTitle: "Family Trust Successor Trustee Transition | Private Office | MailMyPDF",
  seoDescription: "Catalog entry for Family Trust Successor Trustee Transition. This workflow is not yet available for execution or mailing.",
  eyebrow: "Private Office workflow",
  heroTitle: "Family Trust Successor Trustee Transition",
  heroDescription: "Catalog-only workflow. Review source records, facts, documents, and required approvals before any future workflow launch.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
