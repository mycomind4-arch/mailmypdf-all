import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "unauthorized-entry-complaint",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/unauthorized-entry-complaint",
  startPath: "/tenant-reply/workflows/unauthorized-entry-complaint/start",
  title: "Unauthorized Entry Complaint",
  seoTitle: "Unauthorized Entry Complaint | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Unauthorized Entry Complaint workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Unauthorized Entry Complaint",
  heroDescription: "Use a guided unauthorized entry complaint workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
