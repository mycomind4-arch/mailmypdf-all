import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

/** Catalog scaffold only: no executable runtime or verified legal guidance. */
export const workflowConfig = {
  id: "probate-creditor-notice",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/probate-creditor-notice",
  startPath: "/private-office/workflows/probate-creditor-notice/start",
  title: "Probate Creditor Notice",
  seoTitle: "Probate Creditor Notice | Private Office | MailMyPDF",
  seoDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for probate creditor notice. Verify requirements and obtain appropriate review before acting.",
  eyebrow: "Private Office workflow",
  heroTitle: "Probate Creditor Notice",
  heroDescription: "Organize relevant records, dates, parties, supporting evidence, and reviewable correspondence for probate creditor notice. Verify requirements and obtain appropriate review before acting.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
