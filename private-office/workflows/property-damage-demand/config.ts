import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "property-damage-demand",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/property-damage-demand",
  startPath: "/private-office/workflows/property-damage-demand/start",
  title: "Property Damage Demand",
  seoTitle: "Property Damage Demand | Private Office | MailMyPDF",
  seoDescription: "Use the Property Damage Demand workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Property Damage Demand",
  heroDescription: "Use a guided property damage demand workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
