import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog scaffold only: no executable runtime or verified legal guidance. */
export const workflowConfig = {
  id: "family-trust-successor-trustee-transition",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/family-trust-successor-trustee-transition",
  startPath: "/private-office/workflows/family-trust-successor-trustee-transition/start",
  title: "Family Trust Successor Trustee Transition",
  seoTitle: "Family Trust Successor Trustee Transition | Private Office | MailMyPDF",
  seoDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for family trust successor trustee transition. Verify requirements and obtain appropriate review before acting.",
  eyebrow: "Private Office workflow",
  heroTitle: "Family Trust Successor Trustee Transition",
  heroDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for family trust successor trustee transition. Verify requirements and obtain appropriate review before acting.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
