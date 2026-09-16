import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "habitability-complaint",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/habitability-complaint",
  startPath: "/tenant-reply/workflows/habitability-complaint/start",
  title: "Habitability Complaint",
  seoTitle: "Habitability Complaint | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Habitability Complaint workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Habitability Complaint",
  heroDescription: "Use a guided habitability complaint workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
