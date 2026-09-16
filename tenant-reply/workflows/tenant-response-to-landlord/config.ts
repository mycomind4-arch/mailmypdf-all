import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "tenant-response-to-landlord",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/tenant-response-to-landlord",
  startPath: "/tenant-reply/workflows/tenant-response-to-landlord/start",
  title: "Tenant Response To Landlord",
  seoTitle: "Tenant Response To Landlord | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Tenant Response To Landlord workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Tenant Response To Landlord",
  heroDescription: "Use a guided tenant response to landlord workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
