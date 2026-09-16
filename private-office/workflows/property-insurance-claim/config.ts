import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "property-insurance-claim",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/property-insurance-claim",
  startPath: "/private-office/workflows/property-insurance-claim/start",
  title: "Property Insurance Claim",
  seoTitle: "Property Insurance Claim | Private Office | MailMyPDF",
  seoDescription: "Use the Property Insurance Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Property Insurance Claim",
  heroDescription: "Use a guided property insurance claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
