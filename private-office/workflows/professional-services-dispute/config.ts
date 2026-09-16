import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "professional-services-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/professional-services-dispute",
  startPath: "/private-office/workflows/professional-services-dispute/start",
  title: "Professional Services Dispute",
  seoTitle: "Professional Services Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Professional Services Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Professional Services Dispute",
  heroDescription: "Use a guided professional services dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
