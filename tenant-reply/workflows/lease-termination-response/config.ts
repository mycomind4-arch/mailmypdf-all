import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "lease-termination-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/lease-termination-response",
  startPath: "/tenant-reply/workflows/lease-termination-response/start",
  title: "Lease Termination Response",
  seoTitle: "Lease Termination Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Lease Termination Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Lease Termination Response",
  heroDescription: "Use a guided lease termination response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
