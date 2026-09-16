import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "property-title-history-investigation",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/property-title-history-investigation",
  startPath: "/private-office/workflows/property-title-history-investigation/start",
  title: "Property Title History Investigation",
  seoTitle: "Property Title History Investigation | Private Office | MailMyPDF",
  seoDescription: "Use the Property Title History Investigation workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Property Title History Investigation",
  heroDescription: "Use a guided property title history investigation workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
