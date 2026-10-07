import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog scaffold only: no executable runtime or verified legal guidance. */
export const workflowConfig = {
  id: "family-trust-distribution-request",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/family-trust-distribution-request",
  startPath: "/private-office/workflows/family-trust-distribution-request/start",
  title: "Family Trust Distribution Request",
  seoTitle: "Family Trust Distribution Request | Private Office | MailMyPDF",
  seoDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for family trust distribution request. Verify requirements and obtain appropriate review before acting.",
  eyebrow: "Private Office workflow",
  heroTitle: "Family Trust Distribution Request",
  heroDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for family trust distribution request. Verify requirements and obtain appropriate review before acting.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
