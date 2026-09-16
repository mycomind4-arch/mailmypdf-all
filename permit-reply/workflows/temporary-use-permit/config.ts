import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "temporary-use-permit",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/temporary-use-permit",
  startPath: "/permit-reply/workflows/temporary-use-permit/start",
  title: "Temporary Use Permit",
  seoTitle: "Temporary Use Permit | Permit Reply | MailMyPDF",
  seoDescription: "Use the Temporary Use Permit workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Temporary Use Permit",
  heroDescription: "Use a guided temporary use permit workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
