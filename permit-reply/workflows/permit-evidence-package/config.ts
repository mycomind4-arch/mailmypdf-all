import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "permit-evidence-package",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/permit-evidence-package",
  startPath: "/permit-reply/workflows/permit-evidence-package/start",
  title: "Permit Evidence Package",
  seoTitle: "Permit Evidence Package | Permit Reply | MailMyPDF",
  seoDescription: "Use the Permit Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Permit Evidence Package",
  heroDescription: "Use a guided permit evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
