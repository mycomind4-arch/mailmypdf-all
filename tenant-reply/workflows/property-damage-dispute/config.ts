import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "property-damage-dispute",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/property-damage-dispute",
  startPath: "/tenant-reply/workflows/property-damage-dispute/start",
  title: "Property Damage Dispute",
  seoTitle: "Property Damage Dispute | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Property Damage Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Property Damage Dispute",
  heroDescription: "Use a guided property damage dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
