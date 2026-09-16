import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "mold-water-damage-notice",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/mold-water-damage-notice",
  startPath: "/tenant-reply/workflows/mold-water-damage-notice/start",
  title: "Mold Water Damage Notice",
  seoTitle: "Mold Water Damage Notice | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Mold Water Damage Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Mold Water Damage Notice",
  heroDescription: "Use a guided mold water damage notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
