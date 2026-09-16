import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "temporary-structure-permit",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/temporary-structure-permit",
  startPath: "/permit-reply/workflows/temporary-structure-permit/start",
  title: "Temporary Structure Permit",
  seoTitle: "Temporary Structure Permit | Permit Reply | MailMyPDF",
  seoDescription: "Use the Temporary Structure Permit workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Temporary Structure Permit",
  heroDescription: "Use a guided temporary structure permit workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
