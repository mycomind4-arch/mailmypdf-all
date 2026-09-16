import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "landlord-communication-documentation",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/landlord-communication-documentation",
  startPath: "/tenant-reply/workflows/landlord-communication-documentation/start",
  title: "Landlord Communication Documentation",
  seoTitle: "Landlord Communication Documentation | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Landlord Communication Documentation workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Landlord Communication Documentation",
  heroDescription: "Use a guided landlord communication documentation workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
