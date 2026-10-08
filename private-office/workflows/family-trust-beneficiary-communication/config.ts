import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog scaffold only: no executable runtime or verified legal guidance. */
export const workflowConfig = {
  id: "family-trust-beneficiary-communication",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/family-trust-beneficiary-communication",
  startPath: "/private-office/workflows/family-trust-beneficiary-communication/start",
  title: "Family Trust Beneficiary Communication",
  seoTitle: "Family Trust Beneficiary Communication | Private Office | MailMyPDF",
  seoDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for family trust beneficiary communication. Verify requirements and obtain appropriate review before acting.",
  eyebrow: "Private Office workflow",
  heroTitle: "Family Trust Beneficiary Communication",
  heroDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for family trust beneficiary communication. Verify requirements and obtain appropriate review before acting.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
