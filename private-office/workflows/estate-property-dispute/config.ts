import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "estate-property-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/estate-property-dispute",
  startPath: "/private-office/workflows/estate-property-dispute/start",
  title: "Estate Property Dispute",
  seoTitle: "Estate Property Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Estate Property Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Estate Property Dispute",
  heroDescription: "Use a guided estate property dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
