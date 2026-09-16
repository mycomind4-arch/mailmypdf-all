import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "unresolved-repair-follow-up",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/unresolved-repair-follow-up",
  startPath: "/tenant-reply/workflows/unresolved-repair-follow-up/start",
  title: "Unresolved Repair Follow Up",
  seoTitle: "Unresolved Repair Follow Up | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Unresolved Repair Follow Up workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Unresolved Repair Follow Up",
  heroDescription: "Use a guided unresolved repair follow up workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
