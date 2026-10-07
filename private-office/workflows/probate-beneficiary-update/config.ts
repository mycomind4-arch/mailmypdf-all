import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog scaffold only: no executable runtime or verified legal guidance. */
export const workflowConfig = {
  id: "probate-beneficiary-update",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/probate-beneficiary-update",
  startPath: "/private-office/workflows/probate-beneficiary-update/start",
  title: "Probate Beneficiary Update",
  seoTitle: "Probate Beneficiary Update | Private Office | MailMyPDF",
  seoDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for probate beneficiary update. Verify requirements and obtain appropriate review before acting.",
  eyebrow: "Private Office workflow",
  heroTitle: "Probate Beneficiary Update",
  heroDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for probate beneficiary update. Verify requirements and obtain appropriate review before acting.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
