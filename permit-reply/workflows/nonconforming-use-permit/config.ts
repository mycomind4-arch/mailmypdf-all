import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "nonconforming-use-permit",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/nonconforming-use-permit",
  startPath: "/permit-reply/workflows/nonconforming-use-permit/start",
  title: "Nonconforming Use Permit",
  seoTitle: "Nonconforming Use Permit | Permit Reply | MailMyPDF",
  seoDescription: "Use the Nonconforming Use Permit workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Nonconforming Use Permit",
  heroDescription: "Use a guided nonconforming use permit workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
