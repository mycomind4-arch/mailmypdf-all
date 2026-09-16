import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "litigation-hold-letter",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/litigation-hold-letter",
  startPath: "/private-office/workflows/litigation-hold-letter/start",
  title: "Litigation Hold Letter",
  seoTitle: "Litigation Hold Letter | Private Office | MailMyPDF",
  seoDescription: "Use the Litigation Hold Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Litigation Hold Letter",
  heroDescription: "Use a guided litigation hold letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
