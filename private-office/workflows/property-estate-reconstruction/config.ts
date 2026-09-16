import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "property-estate-reconstruction",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/property-estate-reconstruction",
  startPath: "/private-office/workflows/property-estate-reconstruction/start",
  title: "Property Estate Reconstruction",
  seoTitle: "Property Estate Reconstruction | Private Office | MailMyPDF",
  seoDescription: "Use the Property Estate Reconstruction workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Property Estate Reconstruction",
  heroDescription: "Use a guided property estate reconstruction workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
