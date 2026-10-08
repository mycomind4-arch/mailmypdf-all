import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog scaffold only: no executable runtime or verified legal guidance. */
export const workflowConfig = {
  id: "probate-estate-administration",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/probate-estate-administration",
  startPath: "/private-office/workflows/probate-estate-administration/start",
  title: "Probate Estate Administration",
  seoTitle: "Probate Estate Administration | Private Office | MailMyPDF",
  seoDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for probate estate administration. Verify requirements and obtain appropriate review before acting.",
  eyebrow: "Private Office workflow",
  heroTitle: "Probate Estate Administration",
  heroDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for probate estate administration. Verify requirements and obtain appropriate review before acting.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
