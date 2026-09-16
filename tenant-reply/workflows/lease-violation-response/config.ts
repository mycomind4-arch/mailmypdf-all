import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "lease-violation-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/lease-violation-response",
  startPath: "/tenant-reply/workflows/lease-violation-response/start",
  title: "Lease Violation Response",
  seoTitle: "Lease Violation Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Lease Violation Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Lease Violation Response",
  heroDescription: "Use a guided lease violation response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
